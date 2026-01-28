import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";

const generateMathProblem = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  return { num1, num2, answer: num1 + num2 };
};

const FeedbackForm = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile, organization } = useOrganization();

  const [name, setName] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [mathAnswer, setMathAnswer] = useState("");
  const [mathProblem, setMathProblem] = useState(generateMathProblem);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Pre-fill form with user data if available
  useEffect(() => {
    if (profile?.full_name) {
      setName(profile.full_name);
    }
    if (organization?.name) {
      setOrganisationName(organization.name);
    }
    if (user?.email) {
      setEmail(user.email);
    }
  }, [profile, organization, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!organisationName.trim()) {
      toast({ title: "Organisation name is required", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email address is required", variant: "destructive" });
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    if (!feedback.trim()) {
      toast({ title: "Feedback details are required", variant: "destructive" });
      return;
    }
    if (feedback.trim().length < 10) {
      toast({ title: "Please provide more detailed feedback (at least 10 characters)", variant: "destructive" });
      return;
    }

    // Validate math answer
    const userAnswer = parseInt(mathAnswer, 10);
    if (isNaN(userAnswer) || userAnswer !== mathProblem.answer) {
      toast({ title: "Incorrect answer. Please try again.", variant: "destructive" });
      setMathProblem(generateMathProblem());
      setMathAnswer("");
      return;
    }

    setIsSubmitting(true);

    try {
      // Store feedback in the database
      const { error } = await supabase.from("feature_usage_logs").insert({
        feature_name: "beta_feedback",
        feature_category: "Feedback",
        user_id: user?.id || null,
        organization_id: organization?.id || null,
        page_path: JSON.stringify({
          name: name.trim().slice(0, 100),
          organisation: organisationName.trim().slice(0, 100),
          email: email.trim().slice(0, 255),
          feedback: feedback.trim().slice(0, 2000),
        }),
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({ title: "Thank you for your feedback!", description: "We appreciate your help in improving Bosplan." });
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({ title: "Failed to submit feedback", description: "Please try again later.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-brand-green/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-brand-green" />
            </div>
            <h2 className="text-xl font-semibold">Thank You!</h2>
            <p className="text-muted-foreground">
              Your feedback has been submitted successfully. We truly appreciate your help in making Bosplan better.
            </p>
            <Button onClick={() => navigate(-1)} className="mt-4">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0 rounded-xl hover:bg-secondary/80"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Beta Feedback Form</h1>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Share Your Feedback</CardTitle>
            <CardDescription>
              Help us improve Bosplan by sharing your thoughts, suggestions, or reporting any issues you've encountered.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organisation">
                  Organisation Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="organisation"
                  placeholder="Your organisation name"
                  value={organisationName}
                  onChange={(e) => setOrganisationName(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">
                  Details of Feedback <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Please describe your feedback, suggestions, or any issues you've encountered..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {feedback.length}/2000
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="math">
                  Verification <span className="text-destructive">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Please solve this simple math problem to verify you're not a robot:
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-medium bg-secondary px-4 py-2 rounded-lg">
                    {mathProblem.num1} + {mathProblem.num2} = ?
                  </span>
                  <Input
                    id="math"
                    type="number"
                    placeholder="Answer"
                    value={mathAnswer}
                    onChange={(e) => setMathAnswer(e.target.value)}
                    className="w-24"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2 bg-brand-orange hover:bg-brand-orange/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default FeedbackForm;
