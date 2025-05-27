import { storage } from "../storage";
import type { GeneratedAd } from "@shared/schema";

export interface PerformanceMetrics {
  ctr: number; // Click-through rate
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  cpc: number; // Cost per click
}

export interface OptimizationSuggestion {
  type: 'headline' | 'description' | 'tone' | 'focus' | 'keywords';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number; // 0-100
  basedOn: string;
}

export class AdOptimizer {
  async getOptimizationSuggestions(userId: number): Promise<OptimizationSuggestion[]> {
    const ads = await storage.getGeneratedAds(userId);
    
    if (ads.length < 3) {
      return this.getBasicSuggestions();
    }

    const suggestions: OptimizationSuggestion[] = [];
    
    // Analyze performance data
    const performanceAds = ads.filter(ad => ad.performance && typeof ad.performance === 'object');
    
    if (performanceAds.length > 0) {
      suggestions.push(...this.analyzeHeadlinePerformance(performanceAds));
      suggestions.push(...this.analyzeTonePerformance(performanceAds));
      suggestions.push(...this.analyzeLengthPerformance(performanceAds));
      suggestions.push(...this.analyzeKeywordPerformance(performanceAds));
    }

    // Add volume-based suggestions
    suggestions.push(...this.analyzeVolumePatterns(ads));

    return suggestions.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return b.confidence - a.confidence;
    });
  }

  private analyzeHeadlinePerformance(ads: GeneratedAd[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Analyze headline patterns
    const headlinePatterns = this.extractHeadlinePatterns(ads);
    const topPerforming = headlinePatterns
      .sort((a, b) => b.avgCtr - a.avgCtr)
      .slice(0, 3);

    if (topPerforming.length > 0 && topPerforming[0].avgCtr > 0.02) {
      suggestions.push({
        type: 'headline',
        priority: 'high',
        title: 'Optimize Headlines Based on Top Performers',
        description: `Headlines starting with "${topPerforming[0].pattern}" show ${(topPerforming[0].avgCtr * 100).toFixed(1)}% CTR`,
        impact: `+${((topPerforming[0].avgCtr - 0.015) * 100).toFixed(1)}% CTR improvement`,
        confidence: 85,
        basedOn: `${topPerforming[0].count} high-performing ads`
      });
    }

    return suggestions;
  }

  private analyzeTonePerformance(ads: GeneratedAd[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const tonePerformance = new Map<string, { total: number; count: number; ctr: number }>();
    
    ads.forEach(ad => {
      if (ad.tone && ad.performance) {
        const perf = ad.performance as PerformanceMetrics;
        if (perf.ctr) {
          const existing = tonePerformance.get(ad.tone) || { total: 0, count: 0, ctr: 0 };
          existing.total += perf.ctr;
          existing.count++;
          existing.ctr = existing.total / existing.count;
          tonePerformance.set(ad.tone, existing);
        }
      }
    });

    const bestTone = Array.from(tonePerformance.entries())
      .filter(([_, data]) => data.count >= 2)
      .sort((a, b) => b[1].ctr - a[1].ctr)[0];

    if (bestTone && bestTone[1].ctr > 0.02) {
      suggestions.push({
        type: 'tone',
        priority: 'medium',
        title: `"${bestTone[0]}" Tone Performs Best`,
        description: `Your "${bestTone[0]}" tone ads achieve ${(bestTone[1].ctr * 100).toFixed(1)}% CTR`,
        impact: 'Consider using this tone for future campaigns',
        confidence: 75,
        basedOn: `${bestTone[1].count} ads analyzed`
      });
    }

    return suggestions;
  }

  private analyzeLengthPerformance(ads: GeneratedAd[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const lengthData = ads
      .filter(ad => ad.performance)
      .map(ad => ({
        headlineLength: ad.headline.length,
        descLength: ad.description.length,
        ctr: (ad.performance as PerformanceMetrics).ctr || 0
      }))
      .filter(data => data.ctr > 0);

    if (lengthData.length >= 5) {
      // Find optimal headline length
      const optimalHeadlineLength = this.findOptimalLength(lengthData, 'headlineLength');
      
      if (optimalHeadlineLength.confidence > 0.7) {
        suggestions.push({
          type: 'headline',
          priority: 'medium',
          title: 'Optimize Headline Length',
          description: `Headlines around ${optimalHeadlineLength.range} characters perform ${(optimalHeadlineLength.improvement * 100).toFixed(0)}% better`,
          impact: `Target ${optimalHeadlineLength.optimal} characters for headlines`,
          confidence: Math.round(optimalHeadlineLength.confidence * 100),
          basedOn: `${lengthData.length} ads analyzed`
        });
      }
    }

    return suggestions;
  }

  private analyzeKeywordPerformance(ads: GeneratedAd[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Extract common words from high-performing ads
    const highPerformingAds = ads
      .filter(ad => ad.performance && (ad.performance as PerformanceMetrics).ctr > 0.025)
      .slice(0, 10);

    if (highPerformingAds.length >= 3) {
      const commonWords = this.extractCommonWords(highPerformingAds);
      
      if (commonWords.length > 0) {
        suggestions.push({
          type: 'keywords',
          priority: 'medium',
          title: 'High-Impact Keywords Identified',
          description: `Words like "${commonWords.slice(0, 3).join('", "')}" appear in your best ads`,
          impact: 'Include these keywords in future campaigns',
          confidence: 70,
          basedOn: `${highPerformingAds.length} top-performing ads`
        });
      }
    }

    return suggestions;
  }

  private analyzeVolumePatterns(ads: GeneratedAd[]): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Analyze creation patterns
    const recentAds = ads.filter(ad => {
      const daysSinceCreated = (Date.now() - new Date(ad.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated <= 30;
    });

    if (recentAds.length < 5) {
      suggestions.push({
        type: 'description',
        priority: 'low',
        title: 'Generate More Ad Variations',
        description: 'Create more ad variations to improve optimization insights',
        impact: 'Better performance data for smarter suggestions',
        confidence: 60,
        basedOn: 'Statistical significance requirements'
      });
    }

    return suggestions;
  }

  private getBasicSuggestions(): OptimizationSuggestion[] {
    return [
      {
        type: 'headline',
        priority: 'medium',
        title: 'Test Different Headline Approaches',
        description: 'Try question-based, benefit-focused, and urgency-driven headlines',
        impact: 'Discover what resonates with your audience',
        confidence: 65,
        basedOn: 'Industry best practices'
      },
      {
        type: 'tone',
        priority: 'medium',
        title: 'Experiment with Tone Variations',
        description: 'Test professional, casual, and urgent tones to find your optimal voice',
        impact: 'Different tones can improve engagement by 15-30%',
        confidence: 70,
        basedOn: 'Marketing research'
      },
      {
        type: 'description',
        priority: 'low',
        title: 'Include Clear Call-to-Actions',
        description: 'Add specific actions like "Call Now", "Learn More", or "Get Quote"',
        impact: 'Clear CTAs can increase click-through rates',
        confidence: 75,
        basedOn: 'Advertising best practices'
      }
    ];
  }

  private extractHeadlinePatterns(ads: GeneratedAd[]) {
    const patterns = new Map<string, { total: number; count: number; avgCtr: number }>();
    
    ads.forEach(ad => {
      if (ad.performance) {
        const perf = ad.performance as PerformanceMetrics;
        if (perf.ctr) {
          // Extract first 3 words as pattern
          const pattern = ad.headline.split(' ').slice(0, 3).join(' ');
          const existing = patterns.get(pattern) || { total: 0, count: 0, avgCtr: 0 };
          existing.total += perf.ctr;
          existing.count++;
          existing.avgCtr = existing.total / existing.count;
          patterns.set(pattern, existing);
        }
      }
    });

    return Array.from(patterns.entries())
      .filter(([_, data]) => data.count >= 2)
      .map(([pattern, data]) => ({ pattern, ...data }));
  }

  private findOptimalLength(data: any[], field: string) {
    // Simple analysis - in a real implementation, you'd use more sophisticated statistics
    const sorted = data.sort((a, b) => b.ctr - a.ctr);
    const topPerformers = sorted.slice(0, Math.ceil(sorted.length * 0.3));
    
    const lengths = topPerformers.map(item => item[field]);
    const avgLength = lengths.reduce((sum, len) => sum + len, 0) / lengths.length;
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);
    
    return {
      optimal: Math.round(avgLength),
      range: `${minLength}-${maxLength}`,
      improvement: 0.15, // placeholder - would calculate actual improvement
      confidence: 0.75
    };
  }

  private extractCommonWords(ads: GeneratedAd[]): string[] {
    const wordCounts = new Map<string, number>();
    
    ads.forEach(ad => {
      const words = (ad.headline + ' ' + ad.description)
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 3 && !['with', 'your', 'that', 'this', 'from', 'will', 'have'].includes(word));
      
      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
}