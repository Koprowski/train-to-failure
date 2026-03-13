import { DefaultSession } from "next-auth";
import type { AccountType, UserRole } from "@/lib/access";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      accountType: AccountType;
      isAdmin: boolean;
      googleAccountId?: string | null;
    };
  }

  interface User {
    role?: UserRole;
    accountType?: AccountType;
    isAdmin?: boolean;
    googleAccountId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    accountType?: AccountType;
    isAdmin?: boolean;
    googleAccountId?: string | null;
  }
}
