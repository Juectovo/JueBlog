import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// NextAuth v4 在 App Router 中的标准挂载方式
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
