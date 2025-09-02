const GameplayTagSystem = (function() {
    'use strict';
    
    // Configuration
    let enabled = false;
    const tagCache = new Map();        // tag -> Set of cards
    const cardTagCache = new Map();    // card.title -> Set of tags
    const hierarchyCache = new Map();  // tag -> Set of child tags
    
    // Parse tags from description
    function parseTags(description) {
        if (!description || !enabled) return new Set();
        
        // Match $ActiveTags:{tag1, tag2.sub, tag3}
        const match = description.match(/\$ActiveTags:\s*\{([^}]+)\}/);
        if (!match) return new Set();
        
        const tagString = match[1];
        const tags = tagString.split(',').map(t => t.trim()).filter(t => t);
        
        return new Set(tags);
    }
    
    // Build hierarchy cache (player.elite.warrior -> [player, player.elite])
    function getHierarchyChain(tag) {
        const cached = hierarchyCache.get(tag);
        if (cached) return cached;
        
        const parts = tag.split('.');
        const chain = new Set();
        
        for (let i = 1; i <= parts.length; i++) {
            chain.add(parts.slice(0, i).join('.'));
        }
        
        hierarchyCache.set(tag, chain);
        return chain;
    }
    
    // Rebuild tag cache from all cards
    function rebuildCache() {
        if (!enabled) return;
        
        tagCache.clear();
        cardTagCache.clear();
        
        if (typeof storyCards === 'undefined' || !Array.isArray(storyCards)) return;
        
        for (const card of storyCards) {
            if (!card || !card.description) continue;
            
            const tags = parseTags(card.description);
            if (tags.size === 0) continue;
            
            // Cache card -> tags
            cardTagCache.set(card.title, tags);
            
            // Cache tag -> cards (including hierarchy)
            for (const tag of tags) {
                const chain = getHierarchyChain(tag);
                
                for (const hierarchyTag of chain) {
                    if (!tagCache.has(hierarchyTag)) {
                        tagCache.set(hierarchyTag, new Set());
                    }
                    tagCache.get(hierarchyTag).add(card);
                }
            }
        }
    }
    
    // Public API
    return {
        // Enable/disable the system
        enable(shouldEnable = true) {
            enabled = shouldEnable;
            if (enabled) {
                this.rebuildCache();
            } else {
                tagCache.clear();
                cardTagCache.clear();
                hierarchyCache.clear();
            }
            return enabled;
        },
        
        // Check if enabled
        isEnabled() {
            return enabled;
        },
        
        // Rebuild cache (call after bulk card changes)
        rebuildCache() {
            if (!enabled) return;
            rebuildCache();
        },
        
        // Get all cards with a specific tag (includes hierarchy)
        getCardsWithTag(tag) {
            if (!enabled) return [];
            return Array.from(tagCache.get(tag) || []);
        },
        
        // Get all cards matching tag query
        findCardsByTags(query) {
            if (!enabled) return [];
            
            // Parse query: "player.elite && combat || support"
            const predicate = this.parseTagQuery(query);
            const results = [];
            
            for (const [title, tags] of cardTagCache) {
                if (predicate(tags)) {
                    const card = Utilities.storyCard.get(title);
                    if (card) results.push(card);
                }
            }
            
            return results;
        },
        
        // Check if card has tag (includes hierarchy)
        cardHasTag(card, tag) {
            if (!enabled) return false;
            
            const cardTags = cardTagCache.get(card.title);
            if (!cardTags) return false;
            
            // Check if any card tag is in the hierarchy of the query tag
            for (const cardTag of cardTags) {
                const chain = getHierarchyChain(cardTag);
                if (chain.has(tag)) return true;
            }
            
            return false;
        },
        
        // Get all tags for a card
        getCardTags(card) {
            if (!enabled) return [];
            
            const tags = cardTagCache.get(card.title);
            return tags ? Array.from(tags) : [];
        },
        
        // Add tag to card (updates description)
        addTagToCard(card, tag) {
            if (!enabled) return false;
            
            const currentTags = parseTags(card.description);
            currentTags.add(tag);
            
            return this.updateCardTags(card, Array.from(currentTags));
        },
        
        // Remove tag from card
        removeTagFromCard(card, tag) {
            if (!enabled) return false;
            
            const currentTags = parseTags(card.description);
            currentTags.delete(tag);
            
            return this.updateCardTags(card, Array.from(currentTags));
        },
        
        // Update all tags for a card
        updateCardTags(card, tags) {
            if (!enabled) return false;
            
            // Remove old tag reference
            const oldDescription = card.description || '';
            const newDescription = oldDescription.replace(/\$ActiveTags:\s*\{[^}]+\}/, '');
            
            // Add new tags if any
            if (tags && tags.length > 0) {
                const tagString = `$ActiveTags:{${tags.join(', ')}}`;
                card.description = newDescription.trim() + '\n' + tagString;
            } else {
                card.description = newDescription.trim();
            }
            
            // Update the card
            const updated = Utilities.storyCard.update(card.title, { 
                description: card.description 
            });
            
            // Rebuild cache for this card
            if (updated) {
                this.rebuildCache(); // Could optimize to just update this card
            }
            
            return updated;
        },
        
        // Parse tag query into predicate function
        parseTagQuery(query) {
            // Simple implementation - could use ExpressionParser
            return (cardTags) => {
                // For now, just check if any query tag matches
                const queryTags = query.split(/[,\s]+/).filter(t => t);
                
                for (const queryTag of queryTags) {
                    for (const cardTag of cardTags) {
                        const chain = getHierarchyChain(cardTag);
                        if (chain.has(queryTag)) return true;
                    }
                }
                
                return false;
            };
        },
        
        // Get all unique tags in use
        getAllTags() {
            if (!enabled) return [];
            
            const allTags = new Set();
            for (const tags of cardTagCache.values()) {
                for (const tag of tags) {
                    allTags.add(tag);
                }
            }
            
            return Array.from(allTags).sort();
        },
        
        // Get tag statistics
        getTagStats() {
            if (!enabled) return {};
            
            const stats = {};
            
            for (const [tag, cards] of tagCache) {
                stats[tag] = {
                    count: cards.size,
                    cards: Array.from(cards).map(c => c.title)
                };
            }
            
            return stats;
        }
    };
})();
