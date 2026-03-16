import { Children, ReactNode, isValidElement, cloneElement } from 'react'

export function Steps({ children }: { children: ReactNode }) {
  let stepIndex = 0
  const numbered = Children.map(children, (child) => {
    if (isValidElement(child) && (child as React.ReactElement<{ step?: number }>).props.step === undefined) {
      stepIndex++
      return cloneElement(child as React.ReactElement<{ step?: number }>, { step: stepIndex })
    }
    return child
  })
  return (
    <div className="my-6 relative">
      <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-800" aria-hidden />
      <ol className="space-y-6 list-none p-0 m-0">{numbered}</ol>
    </div>
  )
}

export function Step({ title, children, step = 0 }: { title: string; children?: ReactNode; step?: number }) {
  return (
    <li className="relative flex gap-4">
      <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 border-2 border-indigo-500 flex items-center justify-center z-10 text-xs font-bold text-white shadow">
        {step}
      </div>
      <div className="pt-1 pb-2 min-w-0 flex-1">
        <p className="font-semibold text-gray-100 mb-1">{title}</p>
        {children && (
          <div className="text-sm text-gray-300 [&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_a]:text-indigo-400 [&_a]:underline [&_strong]:text-gray-100">
            {children}
          </div>
        )}
      </div>
    </li>
  )
}

/** Auto-numbered convenience wrapper — each child becomes a numbered step */
export function NumberedSteps({ children }: { children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <Steps>
      {items.map((child, i) =>
        child ? (
          <li key={i} className="relative flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 border-2 border-indigo-500 flex items-center justify-center z-10 text-xs font-bold text-white shadow">
              {i + 1}
            </div>
            <div className="pt-1 pb-2 min-w-0 flex-1 text-sm text-gray-300 [&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_a]:text-indigo-400 [&_a]:underline [&_strong]:text-gray-100">
              {child}
            </div>
          </li>
        ) : null
      )}
    </Steps>
  )
}
