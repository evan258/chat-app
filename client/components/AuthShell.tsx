import Image from "next/image";

const bubbles = [
  {text: "Hey! Are you free tonight? 👋", mine: false},
  {text: "Always for you. What's the plan?", mine: true},
  {text: "Dinner and a movie 🍿", mine: false},
  {text: "Count me in! 🎉", mine: true},
];

const AuthShell = ({children}: {children: React.ReactNode}) => {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-brand-light">
      <div className="relative overflow-hidden bg-linear-to-br from-brand-dark via-brand to-brand-accent lg:w-1/2 lg:min-h-screen px-8 pt-10 pb-20 lg:py-16 rounded-b-[40px] lg:rounded-none flex flex-col lg:justify-between">
        <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-white/10" />

        <Image src="/logo-light.svg" alt="E-Chat" width={150} height={50} preload={true} className="relative" />

        <div className="relative hidden lg:flex flex-col gap-3 max-w-sm w-full mx-auto my-10">
          {bubbles.map((bubble) => (
            <div
              key={bubble.text}
              className={`px-4 py-3 rounded-2xl shadow-lg w-fit max-w-[85%] ${
                bubble.mine
                  ? "self-end bg-brand-dark text-white rounded-br-sm"
                  : "bg-white text-gray-800 rounded-bl-sm"
              }`}
            >
              {bubble.text}
            </div>
          ))}
        </div>

        <div className="relative hidden lg:block text-white">
          <h2 className="mb-2">Chat with the people you care about</h2>
          <p className="text-white/80">Fast, simple and always in sync.</p>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-start lg:items-center px-4 lg:px-10 -mt-12 lg:mt-0 pb-10">
        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl shadow-brand/10 px-6 sm:px-10 py-10 flex flex-col">
          {children}
        </div>
      </div>
    </div>
  )
}

export default AuthShell
