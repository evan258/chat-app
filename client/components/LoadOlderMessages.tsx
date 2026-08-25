import { Loader } from "lucide-react"

const LoadOlderMessages = ({isComponent=false} : {isComponent?: boolean}) => {
  return (
    <div 
      className={`absolute left-0 right-0 z-50 
        ${isComponent ? "bg-white/50 top-0 bottom-0" : "top-3 h-10"}
        flex justify-center items-center
      `}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-b from-white to-gray-200 shadow-md">
        <Loader className="animate-spin size-5" />
      </div>
    </div>
  )
}

export default LoadOlderMessages
