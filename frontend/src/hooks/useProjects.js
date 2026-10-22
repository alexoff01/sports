import { useQuery } from "@tanstack/react-query";
import { api, hasBackend } from "@/lib/api";

const fetchList = async () => {
  const res = await api.get("/projects");
  return Array.isArray(res.data) ? res.data : [];
};

export const useProjects = () => {
  const q = useQuery({ queryKey: ["projects"], queryFn: fetchList, enabled: hasBackend, retry: 1 });
  return { projects: q.data ?? [], loading: hasBackend && q.isLoading, error: q.isError || !hasBackend };
};

export const useProject = (slug) => {
  const q = useQuery({
    queryKey: ["project", slug],
    queryFn: async () => (await api.get(`/projects/${encodeURIComponent(slug)}`)).data,
    enabled: hasBackend && Boolean(slug),
    retry: false,
  });
  return { project: q.data ?? null, loading: hasBackend && q.isLoading, error: q.isError || !hasBackend };
};
