"use client";

import { authClient } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { signupFormData, signupSchema } from "@/lib/schemas";
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

const SignupPage = () => {
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<signupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!sessionPending && session) {
      router.replace("/");
    }
  }, [session, sessionPending, router]);

  const handleSignup = async (data: signupFormData) => {
    setEmailLoading(true);

    const { error } = await authClient.signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
      callbackURL: "/",
    });

    setEmailLoading(false);

    if (error) {
      toast.error(error.message || "Registration failed. Please check your details and try again.");
      return;
    }

    setSignupComplete(true);
  };

  const handleResendVerification = async () => {
    setResendLoading(true);

    const { error } = await authClient.sendVerificationEmail({
      email: getValues("email"),
      callbackURL: "/",
    });

    setResendLoading(false);

    if (error) {
      toast.error(error.message || "Failed to resend verification email. Please try again later.");
      return;
    }

    toast.success("Verification email sent");
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    setGoogleLoading(false);

    if (error) {
      toast.error(error.message || "Failed to sign up with Google. Please try again.");
    }
  };

  if (sessionPending) return <Loading />;

  return (
    <div className="min-h-screen w-screen flex justify-center items-center overflow-y-auto">
      <div className="sm:max-w-150 w-full m-2 px-8 md:px-10 flex flex-col min-h-max py-10 rounded-xl border border-gray-50 shadow-lg">

        <Image
          src="/logo-dark.svg"
          alt="logo"
          width={150}
          height={50}
          className="mb-8"
        />

        {signupComplete ? (
          <div className="flex flex-col items-center text-center py-8">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
              <Mail className="size-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-3">
              Check your email
            </h3>
            <p className="text-gray-500 text-sm leading-6 max-w-md">
              We sent a verification link to
            </p>
            <p className="font-medium text-gray-900 mt-1 break-all">
              {getValues("email")}
            </p>
            <p className="text-sm text-gray-500 max-w-sm">
              We sent a verification link to your email address.
              Click the link to verify your account and continue.
            </p>
            <div className="relative w-full mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendVerification}
                className="w-full py-5"
              >
                Resend verification email
              </Button>
              {resendLoading && (
                <LoadOlderMessages isComponent={true} />
              )}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              You can close this page after receiving the email.
            </p>
          </div>
        ) : (
          <>
            <h3 className="mb-6">Create your account</h3>
            <form
              onSubmit={handleSubmit(handleSignup)}
              className="space-y-2"
            >
              <Label className="text-gray-500">
                Name
              </Label>
              <Input
                {...register("name")}
                placeholder="Enter your name"
                className="py-5! px-3! rounded-md text-gray-800"
              />

              {errors.name && (
                <p className="text-red-500 text-sm mb-0.5">
                  {errors.name.message}
                </p>
              )}

              <Label className="text-gray-500 mt-2">
                Email
              </Label>
              <Input
                {...register("email")}
                placeholder="Enter your email address"
                className="py-5! px-3! rounded-md text-gray-800"
              />

              {errors.email && (
                <p className="text-red-500 text-sm mb-0.5">
                  {errors.email.message}
                </p>
              )}

              <Label className="text-gray-500 mt-2">
                Password
              </Label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Create a password"
                  className="py-5! px-3! rounded-md text-gray-800"
                />

                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:bg-transparent bg-transparent text-black rounded-xl absolute top-1/2 -translate-y-1/2 right-3 z-10"
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </Button>
              </div>

              {errors.password && (
                <p className="text-red-500 text-sm mb-0.5">
                  {errors.password.message}
                </p>
              )}

              <div className="w-full relative">
                <Button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-5 mt-4 mb-4 hover:bg-blue-800"
                >
                  Sign up
                </Button>

                {emailLoading && (
                  <LoadOlderMessages isComponent={true} />
                )}
              </div>
            </form>

            <div className="w-full relative">
              <Button
                type="button"
                onClick={handleGoogleSignup}
                className="w-full bg-black font-normal py-5 my-4"
              >
                <Image
                  src={google}
                  alt="google-icon"
                  width={20}
                  height={20}
                />

                Continue with Google
              </Button>

              {googleLoading && (
                <LoadOlderMessages isComponent={true} />
              )}
            </div>

            <span className="text-center">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-blue-500 font-medium underline"
              >
                Sign in
              </Link>
            </span>
            </>
          )}
      </div>
    </div>
  );
};

export default SignupPage;
