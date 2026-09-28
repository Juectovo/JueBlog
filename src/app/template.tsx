"use client";

import { motion } from "framer-motion";

/**
 * 页面切换微动效：每次路由切换内容区淡入 + 轻微上移（克制）
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
