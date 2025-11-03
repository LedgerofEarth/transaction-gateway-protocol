import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, FileText, Code, Shield, Zap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <GitBranch className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Transaction Gateway Protocol</h1>
                <p className="text-sm text-muted-foreground">TGP-00 Specification</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">v0.1-draft</Badge>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/ledgerofearth/vgp" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="outline">
              Published by Ledger of Earth
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              BGP for Transactions
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Trust-boundary routing protocol for atomic value transfers across administrative domains using HTLCs and path-vector routing
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" asChild>
                <a href="/specs/VGP-00.md">
                  <FileText className="mr-2 h-5 w-5" />
                  Read Specification
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/examples/three-domain-flow.md">
                  <Code className="mr-2 h-5 w-5" />
                  View Examples
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-center mb-12 text-foreground">Core Features</h3>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <GitBranch className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Path-Vector Routing</CardTitle>
                <CardDescription>
                  Advertise costs and policies across trust boundaries without exposing internal topology
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-2">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Atomic Settlement</CardTitle>
                <CardDescription>
                  HTLCs ensure all-or-nothing value transfer with cryptographic guarantees
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Policy Enforcement</CardTitle>
                <CardDescription>
                  Gateway-level validation of compliance, rate limits, and risk thresholds
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Protocol Flow */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-center mb-12 text-foreground">Protocol Lifecycle</h3>
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-primary">1</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Discover</h4>
                    <p className="text-sm text-muted-foreground">QUERY → ADVERT</p>
                  </div>
                  <div className="hidden md:block text-muted-foreground">→</div>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-primary">2</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Lock</h4>
                    <p className="text-sm text-muted-foreground">SELECT → LOCKED</p>
                  </div>
                  <div className="hidden md:block text-muted-foreground">→</div>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-primary">3</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Serve</h4>
                    <p className="text-sm text-muted-foreground">x402 delivery</p>
                  </div>
                  <div className="hidden md:block text-muted-foreground">→</div>
                  <div className="flex flex-col items-center text-center">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                      <span className="text-lg font-bold text-accent">4</span>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1">Settle</h4>
                    <p className="text-sm text-muted-foreground">PROOF → SETTLE</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Documentation Links */}
      <section className="border-b border-border">
        <div className="container mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-center mb-12 text-foreground">Documentation</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <a href="/specs/TGP-00.md" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Full Specification
                  </CardTitle>
                  <CardDescription>
                    Complete VGP-00 protocol definition with message types and state machine
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>

            <a href="/examples/three-domain-flow.md" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Example Flows
                  </CardTitle>
                  <CardDescription>
                    Detailed three-domain scenario with complete JSON messages
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>

            <a href="/schemas/vgp-messages.json" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    JSON Schemas
                  </CardTitle>
                  <CardDescription>
                    Message validation schemas for all TGP message types
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>

            <a href="/drafts/VGP-attribute-registry.md" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Attribute Registry
                  </CardTitle>
                  <CardDescription>
                    Extensible metadata fields for QoS, compliance, and cost
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>

            <a href="/drafts/VGP-one-pager.md" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    One-Pager
                  </CardTitle>
                  <CardDescription>
                    Executive summary and use cases for TGP
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>

            <a href="/drafts/roadmap.md" className="block">
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Roadmap
                  </CardTitle>
                  <CardDescription>
                    Future development plans and version timeline
                  </CardDescription>
                </CardHeader>
              </Card>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-muted-foreground">
                © 2025 Ledger of Earth • Apache 2.0 License
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://github.com/ledgerofearth/vgp" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="mailto:dbigge@ledgerofearth.org">
                  Contact
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://ledgerofearth.org" target="_blank" rel="noopener noreferrer">
                  Ledger of Earth
                </a>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
