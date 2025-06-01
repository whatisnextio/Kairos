import React, { useEffect } from &#39;react&#39;;
import Card from &#39;../components/common/Card&#39;; // [cite: 169]
import Button from &#39;../components/common/Button&#39;; // [cite: 169]
import { useNavigate } from &#39;react-router-dom&#39;; // [cite: 169]
import { useAppStore, AiSuggestion, ActiveAiChallenge } from &#39;../store/useAppStore&#39;; // [cite: 170]
import { Zap, CheckSquare, RotateCcw } from &#39;lucide-react&#39;; // [cite: 170]

interface AICardProps {
suggestion: AiSuggestion | ActiveAiChallenge; // [cite: 171]
onAccept?: (suggestion: AiSuggestion) =\> void; // [cite: 171]
onComplete?: (challengeId: string) =\> void; // [cite: 171]
onDismiss?: (suggestionId: string) =\> void; // [cite: 172]
isActiveChallenge?: boolean; // [cite: 172]
}

const AICard: React.FC&lt;AICardProps&gt; = ({ suggestion, onAccept, onComplete, onDismiss, isActiveChallenge }) =\> {
const isCompleted = (suggestion as ActiveAiChallenge).status === 'completed'; // [cite: 172]
return (
\<Card className={`mb-4 border-l-4 ${isActiveChallenge ? 'border-yellow-500' : 'border-green-500'}`}\>
&lt;div className=&quot;flex justify-between items-start&quot;&gt;
&lt;div&gt;
\<h3 className={`font-oswald text-lg ${isActiveChallenge ? 'text-yellow-400' : 'text-green-400'}`}\>
{suggestion.kairos\_phase && &lt;span className=&quot;text-xs uppercase bg-gray-700 px-2 py-0.5 rounded mr-2&quot;&gt;{suggestion.kairos\_phase}&lt;/span&gt;}
{suggestion.title}
&lt;/h3&gt;
{suggestion.domain\_type && &lt;p className=&quot;text-xs text-gray-400 capitalize mb-1&quot;&gt;Domain: {suggestion.domain\_type.toLowerCase()}&lt;/p&gt;}
&lt;/div&gt;
{suggestion.xp\_reward && (
&lt;span className=&quot;text-sm font-bold text-yellow-400 bg-gray-700 px-2 py-1 rounded&quot;&gt;+{suggestion.xp\_reward} XP&lt;/span&gt;
)}
&lt;/div&gt;
&lt;p className=&quot;text-sm text-gray-300 my-2&quot;&gt;{suggestion.description}&lt;/p&gt;
