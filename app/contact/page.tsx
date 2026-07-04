import { PublicLayout } from "@/components/layout/public-layout";
import { GlowCard } from "@/components/ui/glow-card";
import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-background min-h-[60vh] flex flex-col justify-center">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            For product support, billing questions, or security-related inquiries, contact us.
          </p>

          <GlowCard className="mt-12 p-12 text-center max-w-lg mx-auto">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">CtrlCode Support</h3>
            <p className="text-sm text-muted-foreground mb-8">A product of irsSMEX.</p>
            
            <a
              href="mailto:irssmex@gmail.com"
              className="cc-button-primary h-12 px-8 text-base"
            >
              irssmex@gmail.com
            </a>
          </GlowCard>
        </div>
      </section>
    </PublicLayout>
  );
}
