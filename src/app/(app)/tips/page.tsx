import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Clock,
  Package,
  AlertTriangle,
  Ban,
  Lightbulb,
  Users,
  Paintbrush,
  Timer,
  Camera,
  Music,
  Utensils,
  Phone,
  CreditCard,
  CloudRain,
  UserX,
  Shirt,
  Mic,
  Thermometer,
  Car,
  Cake,
  Brain,
  ListChecks,
  Scissors,
  Sparkles,
  Heart,
} from "lucide-react";
import { EmergencyKitChecklist } from "./emergency-kit";

const budgetHacks = [
  {
    tip: "Ask florist to decorate cake with fresh flowers",
    savings: "Saves $100-300",
  },
  {
    tip: "Repurpose ceremony flowers at reception",
    savings: "Ask florist to plan double-duty arrangements",
  },
  {
    tip: "Display cake + sheet cake from kitchen",
    savings: "Saves 40-60%",
  },
  {
    tip: "Choose in-season, locally grown flowers",
    savings: "Lower markup, fresher blooms",
  },
  {
    tip: "Bulk non-floral items from Amazon",
    savings: "Candles, votives, card boxes",
  },
  {
    tip: "Use greenery-heavy arrangements",
    savings: "Eucalyptus & ferns cost less than blooms",
  },
  {
    tip: "Pick an architecturally stunning venue",
    savings: "Needs less decor",
  },
  {
    tip: 'Skip the "wedding" label',
    savings: 'Order "event" cake, "party" linens',
  },
];

const dayOfTips = [
  {
    icon: Heart,
    tip: "Schedule 10 min alone with partner right after ceremony",
  },
  {
    icon: CreditCard,
    tip: "Lock your card box; assign someone to transport it",
  },
  {
    icon: Users,
    tip: "Assign a people wrangler for family photos (not the photographer)",
  },
  { icon: Music, tip: "Have DJ announce every transition" },
  { icon: Mic, tip: "Use a microphone for vows" },
  {
    icon: Shirt,
    tip: "Sew weights into outfit hem (for lightweight fabrics outdoors)",
  },
  {
    icon: Utensils,
    tip: "EAT. Breakfast, lunch, dinner. Someone must put food in your hands",
  },
  {
    icon: Phone,
    tip: "Put phone away or give it to someone",
  },
  {
    icon: Clock,
    tip: "Brief your wedding party with printed timeline cards",
  },
  {
    icon: CreditCard,
    tip: "Have someone else manage vendor payments/tips on the day",
  },
];

const whatIfScenarios = [
  {
    icon: CloudRain,
    title: "Rain on outdoor wedding",
    solution:
      "Get venue rain plan in writing. Keep clear bubble umbrellas on hand. Inform guests of any changes via your wedding website.",
  },
  {
    icon: UserX,
    title: "Vendor no-show",
    solution:
      "Maintain a backup contact list for every vendor category. Have a friend with a good camera on standby. Keep a Spotify playlist and Bluetooth speaker as DJ backup.",
  },
  {
    icon: Shirt,
    title: "Wardrobe malfunction",
    solution:
      "Your emergency kit covers this: fashion tape, sewing kit, safety pins, and stain remover. Pack extras of anything you cannot live without.",
  },
  {
    icon: Mic,
    title: "Tech/AV failure",
    solution:
      "Test the mic at rehearsal. Bring a portable Bluetooth speaker as backup. Print all readings so they can be delivered without screens.",
  },
  {
    icon: AlertTriangle,
    title: "Guest medical emergency",
    solution:
      "Know the address of the nearest hospital. Designate a specific person as the 911 caller. Keep first aid supplies in your emergency kit.",
  },
  {
    icon: Thermometer,
    title: "Extreme heat",
    solution:
      "Set up water stations and provide fans or shade. Shorten the outdoor ceremony portion to 20 minutes max.",
  },
  {
    icon: Car,
    title: "Key person running late",
    solution:
      "Build a 15-30 minute buffer into the morning schedule. Keep backup transport phone numbers handy.",
  },
  {
    icon: Cake,
    title: "Cake disaster",
    solution:
      "Have a grocery store backup option identified in advance. Or skip the cake cutting entirely \u2014 genuinely, no one notices.",
  },
];

const commonPitfalls = [
  {
    icon: Brain,
    title: "Decision fatigue",
    description:
      "If guests won't notice the difference, flip a coin and move on. Save your energy for decisions that matter.",
  },
  {
    icon: ListChecks,
    title: "Guest list politics",
    description:
      "Set your number early, agree on rules with your partner, and hold the line. Every exception creates three more.",
  },
  {
    icon: Scissors,
    title: "DIY harder than Pinterest",
    description:
      "Do a full test run before committing. Multiply your estimated time by 1.5x per table. Know when to outsource.",
  },
  {
    icon: Timer,
    title: "H&MU delays cascade",
    description:
      "Build buffer time into the morning schedule. Your hair and makeup artist must know the hard deadline, not just the start time.",
  },
  {
    icon: Camera,
    title: "The day goes by in a blur",
    description:
      "Schedule 10 minutes alone with your partner and invest in a good photographer. These are what you keep.",
  },
  {
    icon: Music,
    title: "Over-planning reception",
    description:
      "Once dancing starts, let the DJ manage the flow. Overly rigid schedules kill the vibe.",
  },
  {
    icon: Utensils,
    title: "Forgetting to eat",
    description:
      "Seriously, eat. Assign someone to physically put food in your hands. You will forget otherwise.",
  },
];

export default function TipsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-[family-name:var(--font-heading)]">
            Tips & Emergency Kit
          </h1>
          <Badge variant="secondary">Reference</Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Budget hacks, day-of tips, emergency kit checklist, and what-if
          scenarios.
        </p>
      </div>

      <Tabs defaultValue="budget">
        <TabsList className="w-full flex-wrap">
          <TabsTrigger value="budget">
            <DollarSign className="size-4" />
            Budget Hacks
          </TabsTrigger>
          <TabsTrigger value="dayof">
            <Clock className="size-4" />
            Day-Of Tips
          </TabsTrigger>
          <TabsTrigger value="kit">
            <Package className="size-4" />
            Emergency Kit
          </TabsTrigger>
          <TabsTrigger value="whatif">
            <AlertTriangle className="size-4" />
            What-If
          </TabsTrigger>
          <TabsTrigger value="pitfalls">
            <Ban className="size-4" />
            Pitfalls
          </TabsTrigger>
        </TabsList>

        {/* Budget Hacks */}
        <TabsContent value="budget">
          <div className="grid gap-3 sm:grid-cols-2">
            {budgetHacks.map((hack, i) => (
              <Card key={i} size="sm">
                <CardContent className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <DollarSign className="size-3.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium leading-snug">{hack.tip}</p>
                    <p className="text-xs text-muted-foreground">
                      {hack.savings}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Day-Of Tips */}
        <TabsContent value="dayof">
          <div className="grid gap-3 sm:grid-cols-2">
            {dayOfTips.map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} size="sm">
                  <CardContent className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      <Icon className="size-3.5" />
                    </div>
                    <p className="font-medium leading-snug">{item.tip}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Emergency Kit */}
        <TabsContent value="kit">
          <EmergencyKitChecklist />
        </TabsContent>

        {/* What-If Scenarios */}
        <TabsContent value="whatif">
          <div className="grid gap-4 sm:grid-cols-2">
            {whatIfScenarios.map((scenario, i) => {
              const Icon = scenario.icon;
              return (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Icon className="size-4" />
                      </div>
                      {scenario.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {scenario.solution}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Common Pitfalls */}
        <TabsContent value="pitfalls">
          <div className="space-y-3">
            {commonPitfalls.map((pitfall, i) => {
              const Icon = pitfall.icon;
              return (
                <Card key={i} size="sm">
                  <CardContent className="flex items-start gap-4">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{pitfall.title}</p>
                      <p className="text-muted-foreground leading-relaxed">
                        {pitfall.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
