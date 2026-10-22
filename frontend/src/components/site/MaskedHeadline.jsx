import { motion, useReducedMotion } from "framer-motion";

export const MaskedHeadline = ({ lines, as = "h1", className = "", delay = 0, testId }) => {
  const reduce = useReducedMotion();
  const Tag = as;
  return (
    <Tag className={className} data-testid={testId}>
      {lines.map((line, i) => (
        <span key={line.text} className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
          <motion.span
            className={`block ${line.accent ? "text-volt" : ""}`}
            initial={reduce ? false : { y: "108%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1.05, delay: delay + i * 0.13, ease: [0.76, 0, 0.24, 1] }}
          >
            {line.text}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};
