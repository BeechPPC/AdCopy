import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Shield, 
  Eye, 
  EyeOff, 
  PenTool,
  Loader2
} from "lucide-react";
import { SiGoogle } from "react-icons/si";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { id: string; email: string };
}

export function SettingsModal({ open, onOpenChange, currentUser }: SettingsModalProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    openaiApiKey: "",
    openaiModel: "gpt-4o",
    autoSaveAds: true,
    emailNotifications: false,
    defaultVariations: 3,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    enabled: open && !!currentUser,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          businessName: data.businessName || "AdWriter",
          openaiApiKey: data.openaiApiKey || "",
          openaiModel: data.openaiModel || "gpt-4o",
          autoSaveAds: data.autoSaveAds ?? true,
          emailNotifications: data.emailNotifications ?? false,
          defaultVariations: data.defaultVariations || 3,
        });
      }
    },
  });

  // Fetch API usage
  const { data: apiUsage } = useQuery({
    queryKey: ["/api/usage"],
    enabled: open && !!currentUser,
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload logo mutation
  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await apiRequest("POST", "/api/settings/logo", formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Logo Uploaded",
        description: "Your business logo has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate OpenAI API key mutation
  const validateApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const response = await apiRequest("POST", "/api/settings/validate-openai", { apiKey });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "API Key Valid",
          description: "Your OpenAI API key is working correctly",
        });
      } else {
        toast({
          title: "Invalid API Key",
          description: "Please check your OpenAI API key and try again",
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogoMutation.mutate(file);
    }
  };

  const handleValidateApiKey = () => {
    if (formData.openaiApiKey) {
      validateApiKeyMutation.mutate(formData.openaiApiKey);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* Business Branding Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Business Branding</h3>
            
            {/* Logo Upload */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Business Logo</Label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                  {settings?.businessLogo ? (
                    <img src={settings.businessLogo} alt="Logo" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <PenTool className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                  >
                    {uploadLogoMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {/* Business Name */}
            <div>
              <Label htmlFor="businessName" className="text-sm font-medium text-gray-700 mb-2 block">
                Business Name
              </Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">This will replace "AdWriter" in the interface</p>
            </div>
          </div>

          <Separator />

          {/* OpenAI API Configuration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">OpenAI Configuration</h3>
            
            {/* API Key Input */}
            <div className="mb-6">
              <Label htmlFor="apiKey" className="text-sm font-medium text-gray-700 mb-2 block">
                OpenAI API Key
              </Label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={formData.openaiApiKey}
                    onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleValidateApiKey}
                  disabled={!formData.openaiApiKey || validateApiKeyMutation.isPending}
                >
                  {validateApiKeyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Validate"
                  )}
                </Button>
              </div>
              <div className="flex items-center mt-2">
                <Shield className="text-accent mr-2 h-4 w-4" />
                <p className="text-xs text-gray-600">Your API key is encrypted and stored securely</p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="mb-6">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">ChatGPT Model</Label>
              <Select 
                value={formData.openaiModel} 
                onValueChange={(value) => setFormData({ ...formData, openaiModel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">GPT-4o provides better ad copy quality but costs more</p>
            </div>

            {/* API Usage Display */}
            {apiUsage && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">API Usage</span>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 h-auto p-0">
                      View Details
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Today</div>
                      <div className="font-semibold text-gray-900">{apiUsage.today}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">This Month</div>
                      <div className="font-semibold text-gray-900">{apiUsage.month}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Separator />

          {/* Google Ads Integration */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Google Ads Integration</h3>
            
            <Card className="bg-accent/10 border-accent/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                      <SiGoogle className="text-white text-sm" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{currentUser.email}</div>
                      <div className="text-xs text-gray-500">Connected Account</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 border-red-300">
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          {/* Additional Settings */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preferences</h3>
            
            <div className="space-y-4">
              {/* Auto-save Generated Ads */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Auto-save Generated Ads</div>
                  <div className="text-xs text-gray-500">Automatically save all generated ad copy to history</div>
                </div>
                <Switch
                  checked={formData.autoSaveAds}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoSaveAds: checked })}
                />
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Email Notifications</div>
                  <div className="text-xs text-gray-500">Receive notifications about API usage and updates</div>
                </div>
                <Switch
                  checked={formData.emailNotifications}
                  onCheckedChange={(checked) => setFormData({ ...formData, emailNotifications: checked })}
                />
              </div>

              {/* Default Ad Variations */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Default Ad Variations</Label>
                <Select 
                  value={formData.defaultVariations.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, defaultVariations: parseInt(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 variations</SelectItem>
                    <SelectItem value="5">5 variations</SelectItem>
                    <SelectItem value="10">10 variations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
            className="bg-primary hover:bg-primary/90"
          >
            {saveSettingsMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
