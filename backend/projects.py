321
322
323
324
325
326
327
328
329
330
331
332
333
334
335
336
337
338
339
340
341
342
343
344
345
346
347
348
349
350
351
352
353
354
355
356
357
358
359
360
361
362
363
364
365
366
367
368
369
370
371
372
373
374
375
376
377
378
379
380
381
382
383
384
385
386
387
388
389
390
391
392
393
394
395
396
397
398
399
400
401
402
403
404
405
406
407
408
409
410
411
412
413
414
415
416
417
418
419
420
421
422
423
424
425
426
427
428
429
430
431
432
433
434
435
436
437
438
439
440
441
442
443
444
445
446
447
448
    if not session or not re.fullmatch(r"[a-f0-9-]{36}", upload_id):
        raise HTTPException(status_code=404, detail="Upload not found or expired.")
    if index != session["next_index"]:
        raise HTTPException(status_code=409, detail="Chunks must be sent in order.")
    declared = int(request.headers.get("content-length") or 0)
    if declared > CHUNK_SIZE:
        raise HTTPException(status_code=413, detail="Chunk too large.")
    data = await request.body()
    if not data or len(data) > CHUNK_SIZE or session["received"] + len(data) > session["size"]:
        raise HTTPException(status_code=413, detail="File too large (max 100 MB).")
    if index == 0 and not _sniff_video(data[:64]):
        raise HTTPException(status_code=415, detail="Only MP4 or WebM videos are allowed.")
    with _upload_file(upload_id).open("ab") as fh:
        fh.write(data)
    await db.upload_sessions.update_one({"id": upload_id}, {"$inc": {"next_index": 1, "received": len(data)}})
    return {"received": session["received"] + len(data)}


@router.post("/admin/uploads/video/{upload_id}/complete", status_code=201)
async def video_complete(upload_id: str, _: AdminContext = Depends(require_admin)):
    session = await db.upload_sessions.find_one({"id": upload_id})
    part = _upload_file(upload_id)
    if not session or not part.exists():
        raise HTTPException(status_code=404, detail="Upload not found or expired.")
    try:
        if session["received"] != session["size"] or part.stat().st_size != session["size"]:
            raise HTTPException(status_code=400, detail="Upload incomplete. Please try again.")
        with part.open("rb") as fh:
            kind = _sniff_video(fh.read(64))
        if not kind:
            raise HTTPException(status_code=415, detail="Only MP4 or WebM videos are allowed.")
        content_type = f"video/{kind}"
        media_id = str(uuid.uuid4())

        def _store() -> str:
            with part.open("rb") as fh:
                return _put(f"portfolio/media/{media_id}.{kind}", fh, content_type)

        path = await asyncio.to_thread(_store)
        await db.media.insert_one({"id": media_id, "kind": "video", "path": path, "content_type": content_type,
                                   "size": session["size"], "created_at": now()})
        return {"url": f"/api/media/{media_id}", "content_type": content_type}
    finally:
        part.unlink(missing_ok=True)
        await db.upload_sessions.delete_one({"id": upload_id})


# ---------------------------------------------------------------- media library
async def _in_use(url: str) -> bool:
    return bool(await db.projects.find_one({"$or": [{"cover_image": url}, {"gallery": url}, {"videos": url}]}, {"_id": 1}))


@router.get("/admin/media")
async def media_list(_: AdminContext = Depends(require_admin)):
    items = await db.media.find({"deleted": {"$ne": True}}, {"_id": 0, "path": 0, "variants": 0, "deleted": 0}).sort("created_at", -1).to_list(1000)
    for m in items:
        m["url"] = f"/api/media/{m['id']}"
        m["kind"] = m.get("kind", "image")
        m["in_use"] = await _in_use(m["url"])
        _iso(m)
    return items


@router.delete("/admin/media/{media_id}")
async def media_delete(media_id: str, _: AdminContext = Depends(require_admin)):
    url = f"/api/media/{media_id}"
    if await _in_use(url):
        raise HTTPException(status_code=409, detail="This file is used by a project. Remove it from the project first.")
    res = await db.media.update_one({"id": media_id, "deleted": {"$ne": True}}, {"$set": {"deleted": True, "deleted_at": now()}})
    if not res.modified_count:
        raise HTTPException(status_code=404, detail="Not found.")
    for cached in CACHE_DIR.glob(f"{media_id}.*"):
        cached.unlink(missing_ok=True)
    return {"ok": True}


# ---------------------------------------------------------------- media delivery
async def _cached(record: dict, path: str, ext: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    target = CACHE_DIR / f"{record['id']}.{ext}"
    if not target.exists():
        data = await asyncio.to_thread(_get, path)
        tmp = target.with_suffix(".tmp" + uuid.uuid4().hex[:6])
        tmp.write_bytes(data)
        shutil.move(tmp, target)
    return target


def _range(header: str | None, size: int) -> tuple[int, int] | None:
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", (header or "").strip())
    if not m or (not m.group(1) and not m.group(2)):
        return None
    if m.group(1):
        start, end = int(m.group(1)), int(m.group(2)) if m.group(2) else size - 1
    else:
        start, end = max(0, size - int(m.group(2))), size - 1
    end = min(end, size - 1)
    return (start, end) if start <= end else None


@router.get("/media/{media_id}")
async def media(media_id: str, request: Request):
    record = await db.media.find_one({"id": media_id, "deleted": {"$ne": True}}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Not found.")
    url = f"/api/media/{media_id}"
    public = await db.projects.find_one({"published": True, "$or": [{"cover_image": url}, {"gallery": url}, {"videos": url}]}, {"_id": 1})
    if not public:
        await require_admin(request)
    headers = {"Cache-Control": "public, max-age=86400" if public else "private, no-store", "X-Content-Type-Options": "nosniff",
               "Cross-Origin-Resource-Policy": "same-site"}
    if record.get("kind") == "video":
        ctype = record["content_type"]
        file = await _cached(record, record["path"], ctype.split("/")[1])
        size = file.stat().st_size
        headers |= {"Accept-Ranges": "bytes", "Content-Disposition": f'inline; filename="{media_id}.{ctype.split("/")[1]}"'}
        rng = _range(request.headers.get("range"), size)
        if request.headers.get("range") and not rng:
            return Response(status_code=416, headers={**headers, "Content-Range": f"bytes */{size}"})
        start, end = rng or (0, size - 1)
        with file.open("rb") as fh:
            fh.seek(start)
            chunk = fh.read(end - start + 1)
        if rng:
            headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        return Response(content=chunk, status_code=206 if rng else 200, media_type=ctype, headers=headers)
    variants = record.get("variants") or {"image/webp": record["path"]}
    ctype = "image/avif" if "image/avif" in (request.headers.get("accept") or "") and "image/avif" in variants else "image/webp"
