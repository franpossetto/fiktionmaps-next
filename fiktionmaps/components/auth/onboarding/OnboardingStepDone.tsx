"use client"

export function OnboardingStepDone() {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="mb-12 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          You&apos;re all set!
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          Your preferences have been saved. The map will now highlight the locations most relevant to you.
        </p>
      </div>
    </div>
  )
}
