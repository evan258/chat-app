const UserAvatar = ({name, src, className = "size-12 text-lg"}: {name: string, src?: string, className?: string}) => {
  return (
    <div className={`${className} shrink-0 overflow-hidden rounded-full bg-brand-accent flex items-center justify-center`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span className="text-[length:inherit] font-medium text-white uppercase">{name.trim()[0] || "?"}</span>
      )}
    </div>
  )
}

export default UserAvatar
