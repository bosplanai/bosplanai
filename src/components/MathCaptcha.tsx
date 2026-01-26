import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, X } from "lucide-react";

interface MathCaptchaProps {
  onVerified: (verified: boolean) => void;
  isVerified: boolean;
}

const MathCaptcha = ({ onVerified, isVerified }: MathCaptchaProps) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<"+" | "-">("+");
  const [userAnswer, setUserAnswer] = useState("");
  const [error, setError] = useState(false);

  const generateNewProblem = useCallback(() => {
    const newNum1 = Math.floor(Math.random() * 10) + 1;
    const newNum2 = Math.floor(Math.random() * 10) + 1;
    const newOperator = Math.random() > 0.5 ? "+" : "-";
    
    // Ensure subtraction doesn't result in negative numbers
    if (newOperator === "-" && newNum2 > newNum1) {
      setNum1(newNum2);
      setNum2(newNum1);
    } else {
      setNum1(newNum1);
      setNum2(newNum2);
    }
    
    setOperator(newOperator as "+" | "-");
    setUserAnswer("");
    setError(false);
    onVerified(false);
  }, [onVerified]);

  useEffect(() => {
    generateNewProblem();
  }, []);

  const correctAnswer = operator === "+" ? num1 + num2 : num1 - num2;

  const handleAnswerChange = (value: string) => {
    setUserAnswer(value);
    setError(false);
    
    // Only numbers allowed
    if (!/^-?\d*$/.test(value)) return;
    
    const numValue = parseInt(value, 10);
    
    if (value !== "" && !isNaN(numValue)) {
      if (numValue === correctAnswer) {
        onVerified(true);
      } else if (value.length >= correctAnswer.toString().length) {
        setError(true);
        onVerified(false);
      }
    } else {
      onVerified(false);
    }
  };

  const handleRefresh = () => {
    generateNewProblem();
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        Human Verification
        {isVerified && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3 h-3" />
            Verified
          </span>
        )}
      </Label>
      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2 text-lg font-mono font-semibold text-foreground select-none">
          <span className="bg-background px-2 py-1 rounded border">{num1}</span>
          <span>{operator}</span>
          <span className="bg-background px-2 py-1 rounded border">{num2}</span>
          <span>=</span>
        </div>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={userAnswer}
          onChange={(e) => handleAnswerChange(e.target.value)}
          className={`w-20 text-center font-mono text-lg ${
            error 
              ? "border-destructive focus-visible:ring-destructive" 
              : isVerified 
                ? "border-green-500 focus-visible:ring-green-500 bg-green-50 dark:bg-green-950/30" 
                : ""
          }`}
          placeholder="?"
          disabled={isVerified}
          aria-label="Enter the answer to the math problem"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="shrink-0"
          aria-label="Generate new problem"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <X className="w-3 h-3" />
          Incorrect answer. Please try again.
        </p>
      )}
    </div>
  );
};

export default MathCaptcha;
