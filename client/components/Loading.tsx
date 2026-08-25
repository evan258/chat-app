import { LoaderCircle } from 'lucide-react';

const Loading = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center gap-1">
      <LoaderCircle className='size-6 animate-spin text-third' />
      <span className='text-md font-medium text-third'>Loading...</span>
    </div>
  )
}

export default Loading
