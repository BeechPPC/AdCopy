import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Wand2, 
  Download, 
  RefreshCw, 
  Edit, 
  Copy, 
  Trash2,
  ChevronDown,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdGeneratorProps {
  currentUser: { id: string; email: string };
}

interface GeneratedAd {
  id?: number;
  headline: string;
  description: string;
  displayUrl: string;
  tone?: string;
  focus?: string;
  status?: string;
}

export function AdGenerator({ currentUser }: AdGeneratorProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [targetKeywords, setTargetKeywords] = useState<string>("");
  const [businessDescription, setBusinessDescription] = useState<string>("");
  const [tone, setTone] = useState<string>("Professional");
  const [focus, setFocus] = useState<string>("Benefits");
  const [variations, setVariations] = useState<string>("3");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [generatedAds, setGeneratedAds] = useState<GeneratedAd[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ["/api/campaigns"],
    enabled: !!currentUser,
  });

  // Fetch user settings for model info
  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    enabled: !!currentUser,
  });

  // Generate ads mutation
  const generateAdsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/ads/generate", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedAds(data.ads);
      queryClient.invalidateQueries({ queryKey: ["/api/usage"] });
      toast({
        title: "Ads Generated Successfully",
        description: `Generated ${data.ads.length} ad variations`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateAds = () => {
    if (!businessDescription.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a business description",
        variant: "destructive",
      });
      return;
    }

    if (!targetKeywords.trim()) {
      toast({
        title: "Missing Information", 
        description: "Please provide target keywords",
        variant: "destructive",
      });
      return;
    }

    generateAdsMutation.mutate({
      campaignId: selectedCampaign ? parseInt(selectedCampaign) : null,
      businessDescription,
      targetKeywords: targetKeywords.split(",").map(k => k.trim()),
      tone,
      focus,
      variations: parseInt(variations),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Ad copy has been copied",
    });
  };

  const getCharacterCountStatus = (text: string, limit: number) => {
    const length = text.length;
    if (length <= limit) return "character-count-ok";
    if (length <= limit + 5) return "character-count-warning";
    return "character-count-error";
  };

  const getStatusBadge = (ad: GeneratedAd, index: number) => {
    const headlineStatus = getCharacterCountStatus(ad.headline, 30);
    const descriptionStatus = getCharacterCountStatus(ad.description, 90);
    
    if (headlineStatus === "character-count-error" || descriptionStatus === "character-count-error") {
      return <Badge variant="destructive">Needs Review</Badge>;
    }
    
    if (index === 0) {
      return <Badge className="bg-accent text-accent-foreground">High CTR Potential</Badge>;
    }
    
    if (ad.focus === "Brand") {
      return <Badge className="bg-purple-100 text-purple-700">Brand Focus</Badge>;
    }
    
    return <Badge variant="secondary">Good</Badge>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Campaign Selection & Setup */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campaign Selection */}
            <div className="space-y-2">
              <Label htmlFor="campaign">Select Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Target Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords">Target Keywords</Label>
              <Input
                id="keywords"
                placeholder="running shoes, athletic footwear..."
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
              />
            </div>
          </div>
          
          {/* Business Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Business/Product Description</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe your business, products, or services to help AI generate better ad copy..."
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
            />
          </div>

          {/* Advanced Options */}
          <div>
            <Button
              type="button"
              variant="ghost"
              className="text-primary hover:text-primary/80 p-0"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <ChevronDown className={cn("mr-2 h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
              Advanced Options
            </Button>
            
            {showAdvanced && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional">Professional</SelectItem>
                      <SelectItem value="Casual">Casual</SelectItem>
                      <SelectItem value="Persuasive">Persuasive</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Focus</Label>
                  <Select value={focus} onValueChange={setFocus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Benefits">Benefits</SelectItem>
                      <SelectItem value="Features">Features</SelectItem>
                      <SelectItem value="Price/Value">Price/Value</SelectItem>
                      <SelectItem value="Urgency">Urgency</SelectItem>
                      <SelectItem value="Brand">Brand</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Variations</Label>
                  <Select value={variations} onValueChange={setVariations}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Generation Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Generate Ad Copy</h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">{settings?.openaiModel || "GPT-4"}</span>
              <Button 
                onClick={handleGenerateAds} 
                disabled={generateAdsMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {generateAdsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Ads
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Ad Copy Results */}
      {generatedAds.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Generated Ad Variations</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Export All
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerateAds}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedAds.map((ad, index) => (
              <Card key={index} className="border hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="text-primary border-primary">
                        Variation {index + 1}
                      </Badge>
                      {getStatusBadge(ad, index)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(`${ad.headline}\n${ad.description}`)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Ad Preview */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="text-lg font-medium text-primary">{ad.headline}</div>
                    <div className="text-green-600 text-sm">{ad.displayUrl}</div>
                    <div className="text-gray-700 text-sm">{ad.description}</div>
                  </div>
                  
                  {/* Character Counts */}
                  <div className="flex justify-between text-xs mt-2">
                    <span className={getCharacterCountStatus(ad.headline, 30)}>
                      Headline: {ad.headline.length}/30 chars
                    </span>
                    <span className={getCharacterCountStatus(ad.description, 90)}>
                      Description: {ad.description.length}/90 chars
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
