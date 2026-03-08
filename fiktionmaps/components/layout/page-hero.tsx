interface PageHeroProps {
  title: string
  subtitle?: string
  children?: React.ReactNode
  className?: string
}

export function PageHero({ title, subtitle, children, className = "" }: PageHeroProps) {
  return (
    <div className={`px-8 pt-8 pb-4 ${className}`.trim()}>
      <h1 className="font-sans text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
