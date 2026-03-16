import { ReactNode } from 'react'

/** Wraps doc page content with consistent prose/heading styles */
export function DocsProse({ children }: { children: ReactNode }) {
  return (
    <div className="
      [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mb-4 [&_h1]:mt-0
      [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:scroll-mt-20
      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:scroll-mt-20
      [&_p]:text-gray-300 [&_p]:leading-7 [&_p]:mb-4
      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-4 [&_ul]:text-gray-300
      [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ol]:mb-4 [&_ol]:text-gray-300
      [&_li]:leading-6
      [&_strong]:text-gray-100 [&_strong]:font-semibold
      [&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-indigo-300
      [&_code]:bg-gray-800 [&_code]:text-indigo-300 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[0.8em]
      [&_pre]:bg-gray-900 [&_pre]:border [&_pre]:border-gray-800 [&_pre]:rounded-xl [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:my-4 [&_pre]:text-sm
      [&_pre_code]:bg-transparent [&_pre_code]:text-gray-300 [&_pre_code]:p-0
      [&_hr]:border-gray-800 [&_hr]:my-8
      [&_table]:w-full [&_table]:text-sm [&_table]:border-collapse [&_table]:my-4
      [&_thead]:border-b [&_thead]:border-gray-700
      [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:text-gray-400 [&_th]:uppercase [&_th]:tracking-wider
      [&_td]:py-2.5 [&_td]:px-3 [&_td]:border-b [&_td]:border-gray-800/60 [&_td]:text-gray-300
      [&_tr:hover_td]:bg-gray-900/40
      [&_.lead]:text-lg [&_.lead]:text-gray-300 [&_.lead]:leading-8 [&_.lead]:mb-8
    ">
      {children}
    </div>
  )
}
