import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const PageHeader = ({title, children}: {title: string, children?: React.ReactNode}) => {
  return (
    <header className="bg-linear-to-br from-brand-dark to-brand rounded-b-3xl px-5 pt-6 pb-5 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex size-9 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
          <ArrowLeft className="size-5" />
        </Link>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      {children}
    </header>
  )
}

export default PageHeader
