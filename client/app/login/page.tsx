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
    <div className="min-h-screen w-screen flex justify-center items-center overflow-y-auto">
      <div className="sm:max-w-150 w-full m-2 px-8 md:px-10 flex flex-col min-h-max py-10 rounded-xl border border-gray-50 shadow-lg">
        <Image src="/logo-dark.svg" alt="logo" width={150} height={50} className="mb-8" />

        {resetEmailSent ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Mail className="size-8 text-blue-600" />
            </div>

            <h3 className="text-xl font-semibold mb-3">
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

            <div className="relative w-full mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleForgetPassword}
                className="w-full py-5"
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
              <h3 className="mb-6">Nice to see you again</h3>
              <form onSubmit={handleSubmit(handleLogin)} className="space-y-2">
                <Label className="text-gray-500">
                  Email
                </Label>
                <Input 
                  {...register("email")}
                  placeholder="Enter your email address"
                  className="py-5! px-3! rounded-md text-gray-800"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mb-0.5">{errors.email.message}</p>
                )}
                <Label className="text-gray-500 mt-2">
                  Password
                </Label>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Enter your password"
                    className="py-5! px-3! rounded-md text-gray-800"
                  />
                  <Button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:bg-transparent bg-transparent text-black rounded-xl absolute top-1/2 -translate-y-1/2 right-3 z-10"
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
                <div className="text-center my-2 relative">
                  <span
                    onClick={handleForgetPassword}
                    className={`text-blue-500 font-medium text-sm underline inline-block ${passwordLoading? "" : "cursor-pointer"}`}
                  >
                    Forgot password
                  </span>
                  {passwordLoading && (
                    <LoadOlderMessages isComponent={true} />
                  )}
                </div>
                <div className="w-full relative">
                  <Button type="submit" className="w-full bg-blue-600 text-white py-5 mt-2 mb-4 hover:bg-blue-800">Sign in</Button>
                  {emailLoading &&(
                    <LoadOlderMessages isComponent={true} />
                  )}
                </div>
              </form>
              <div className="w-full relative">
                <Button onClick={handleGoogleLogin} className="w-full bg-black font-normal py-5 my-4">
                  <Image src={google} alt="google-icon" width={20} height={20} />
                  Sign in with Google
                </Button>
                {googleLoading && (
                  <LoadOlderMessages isComponent={true} />
                )}
              </div>
              <span className="text-center">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-blue-500 font-medium underline">Sign up now</Link>
              </span>
            </>
          )}
      </div>
    </div>
  )
}

export default LoginPage
