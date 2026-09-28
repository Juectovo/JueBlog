"use client";

import { motion } from "framer-motion";

/**
 * 列表/区块入场微动效包装（克制：透明度 + 8px 上移，支持错峰延迟）
 * 用法：服务端组件可将渲染好的子元素作为 children 传入
 */
export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
