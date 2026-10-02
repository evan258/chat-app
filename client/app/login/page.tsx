"use client";

import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { loginFormData, loginSchema } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import google from "../../assets/google.svg";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import LoadOlderMessages from "@/components/LoadOlderMessages";
import { Eye, EyeOff, Mail } from "lucide-react";
import Loading from "@/components/Loading";
import AuthShell from "@/components/AuthShell";

const LoginPage = () => {
  const {data: session, isPending: sessionPending} = authClient.useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false); 
  const router = useRouter();

  const {register, handleSubmit, getValues, formState: {errors}} = useForm<loginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!sessionPending && session) {
      router.replace("/");
    }    
  }, [session, sessionPending, router]);


  const handleLogin = async (data: loginFormData) => {
    setEmailLoading(true);
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    setEmailLoading(false);

    if (error) {
      toast.error(error.message || "Invalid email or password. Please try again.");
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    setGoogleLoading(false);

    if (error) {
      toast.error(error.message || "Failed to authenticate with Google. Please try again.");
    }
  }

  const handleForgetPassword = async () => {
    const email = getValues("email");
    if (!email) {
      toast.error("Enter your email address");
      return;
    }

    setPasswordLoading(true);

    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setPasswordLoading(false);

    if (error) {
      toast.error(error.message || "Could not process password reset request. Try again later.");
      return;
    }

    setResetEmailSent(true);
  }


  if (sessionPending) return <Loading />;

  return (
    <AuthShell>
      {resetEmailSent ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-brand-light">
            <Mail className="size-8 text-brand" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-3">
            Check your email
          </h3>

          <p className="text-gray-500 text-sm leading-6 max-w-md">
            We&apos;ve sent a password reset link to
          </p>
          <p className="font-medium text-gray-900 mt-1 break-all">
            {getValues("email")}
          </p>
          <p className="text-sm text-gray-500 max-w-sm mt-3">
            Click the link in the email to create your new password.
          </p>

          <div className="relative w-full mt-8 rounded-xl overflow-hidden">
            <Button
              type="button"
              variant="outline"
              onClick={handleForgetPassword}
              className="w-full h-12 rounded-xl bg-white border-gray-200 text-gray-700 text-base font-medium hover:bg-gray-50"
            >
              {passwordLoading ? "Sending..." : "Resend password reset email"}
            </Button>
            {passwordLoading && (
              <LoadOlderMessages isComponent={true} />
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4">
            You can close this page after receiving the email.
          </p>
        </div>
      ) : (
        <>
          <h3 className="text-2xl font-bold text-gray-900">Welcome back</h3>
          <p className="text-gray-500 text-sm mt-1 mb-8">Nice to see you again, sign in to continue</p>

          <form onSubmit={handleSubmit(handleLogin)} className="space-y-2">
            <Label className="text-gray-600">
              Email
            </Label>
            <Input 
              {...register("email")}
              placeholder="Enter your email address"
              className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-800 focus-visible:border-brand focus-visible:ring-brand/20"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mb-0.5">{errors.email.message}</p>
            )}
            <Label className="text-gray-600 mt-3">
              Password
            </Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"}
                {...register("password")}
                placeholder="Enter your password"
                className="h-12 px-4 rounded-xl bg-gray-50 border-gray-200 text-gray-800 focus-visible:border-brand focus-visible:ring-brand/20"
              />
              <Button 
                onClick={() => setShowPassword(!showPassword)}
                className="hover:bg-transparent bg-transparent text-gray-500 rounded-xl absolute top-1/2 -translate-y-1/2 right-2 z-10"
              >
                {showPassword ? (
                  <Eye />
                ) : (
                    <EyeOff />
                  )}
              </Button>
              {errors.password && (
                <p className="text-red-500 text-sm mb-0.5">{errors.password.message}</p>
              )}
            </div>
            <div className="text-right my-2 relative">
              <span
                onClick={handleForgetPassword}
                className={`text-brand font-medium text-sm hover:underline inline-block ${passwordLoading? "" : "cursor-pointer"}`}
              >
                Forgot password?
              </span>
              {passwordLoading && (
                <LoadOlderMessages isComponent={true} />
              )}
            </div>
            <div className="w-full relative rounded-xl overflow-hidden">
              <Button type="submit" className="w-full h-12 rounded-xl bg-brand text-white text-base font-medium shadow-md shadow-brand/30 hover:bg-brand-dark">Sign in</Button>
              {emailLoading &&(
                <LoadOlderMessages isComponent={true} />
              )}
            </div>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-gray-400 text-sm">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="w-full relative rounded-xl overflow-hidden">
            <Button onClick={handleGoogleLogin} variant="outline" className="w-full h-12 rounded-xl bg-white border-gray-200 text-gray-700 text-base font-medium hover:bg-gray-50">
              <Image src={google} alt="google-icon" width={20} height={20} />
              Sign in with Google
            </Button>
            {googleLoading && (
              <LoadOlderMessages isComponent={true} />
            )}
          </div>

          <span className="text-center text-gray-500 mt-8">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand font-medium hover:underline">Sign up now</Link>
          </span>
        </>
      )}
    </AuthShell>
  )
}

export default LoginPage
