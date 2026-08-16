interface CornerBracketsProps {
  className?: string;
}

export function CornerBrackets({ className = "" }: CornerBracketsProps) {
  return (
    <>
      <div className={`absolute -top-2.5 -left-2.5 w-5 h-5 border-l-2 border-t-2 border-primary ${className}`} />
      <div className={`absolute -bottom-2.5 -right-2.5 w-5 h-5 border-r-2 border-b-2 border-primary ${className}`} />
    </>
  );
}
