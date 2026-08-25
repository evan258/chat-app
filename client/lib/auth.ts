import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer";
import { jwt } from "better-auth/plugins";
import { createAuthMiddleware, APIError } from "better-auth/api";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const email = ctx.body?.email;
      if (!email) return;

      if (ctx.path === "/sign-up/email") {

        const existingUser = await prisma.user.findUnique({
          where: {email},
        });
        
        if (existingUser) {
          if (!existingUser.emailVerified) {
            await prisma.user.delete({
              where: {id: existingUser.id},
            });
            return;
          }

          throw new APIError("BAD_REQUEST", {
            message: "User already exists, try signing in instead"
          });
        }
      }

      if (ctx.path === "/request-password-reset") {
        const existingUser = await prisma.user.findUnique({
          where: {email},
        });

        if (!existingUser) {
          throw new APIError("NOT_FOUND", {
            message: "Account does not exist",
          });
        }
      }
    }),
  },

  rateLimit: {
  enabled: true,
  window: 60,
  max: 1000,
  customRules: {
    "/sign-up/email": {
      window: 60 * 60,
      max: 100,
    },
    "/send-verification-email": {
      window: 60 * 60,
      max: 100,
    },
    "/request-password-reset": {
      window: 60 * 60,
      max: 100,
    },
  },
},

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async({user, url}) => {
      await sendVerificationEmail(user.email, url);
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    
    sendResetPassword: async({user, url}) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }
  },

  user: {
    changeEmail: {
      enabled: true,
    },
  },

  plugins: [
    jwt(),
  ],
});
