import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, TrendingUp, Target, RefreshCw, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizationSuggestion {
  type: 'headline' | 'description' | 'tone' | 'focus' | 'keywords';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  basedOn: string;
}

interface OptimizationSuggestionsProps {
  className?: string;
}

export function OptimizationSuggestions({ className }: OptimizationSuggestionsProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['/api/optimization/suggestions'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const suggestions: OptimizationSuggestion[] = data?.suggestions || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-700 border-red-200 dark:text-red-400';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:text-yellow-400';
      case 'low': return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'headline': return '📝';
      case 'description': return '📄';
      case 'tone': return '🎭';
      case 'focus': return '🎯';
      case 'keywords': return '🔍';
      default: return '💡';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Smart Optimization Suggestions
          </CardTitle>
          <CardDescription>
            Analyzing your ad performance data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Smart Optimization Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered insights based on your ad performance data
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              Generate more ads to unlock personalized optimization suggestions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                onClick={() => setExpandedSuggestion(expandedSuggestion === index ? null : index)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", getPriorityColor(suggestion.priority))}
                        >
                          {suggestion.priority.toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-600" />
                          <span className="text-xs text-green-600 font-medium">
                            {suggestion.confidence}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1">
                      {suggestion.title}
                    </h4>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {suggestion.description}
                    </p>

                    {expandedSuggestion === index && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-green-700 dark:text-green-400">
                              Expected Impact:
                            </span>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                              {suggestion.impact}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium text-blue-700 dark:text-blue-400">
                              Based On:
                            </span>
                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                              {suggestion.basedOn}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <ChevronRight 
                    className={cn(
                      "h-4 w-4 text-gray-400 transition-transform ml-2 flex-shrink-0",
                      expandedSuggestion === index && "rotate-90"
                    )} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <TrendingUp className="h-3 w-3" />
              <span>
                Suggestions update automatically as you create more ads
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}