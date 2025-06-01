/* Placeholder for blurred AI cards */}
          <div className="space-y-3 opacity-60 blur-sm select-none">
            <div className="p-4 bg-gray-700 rounded-lg h-24 animate-pulse"></div>
            <div className="p-4 bg-gray-700 rounded-lg h-24 animate-pulse delay-100"></div>
          </div>
        </Card>
        <div className="space-y-3">
          <Button onClick={() => navigate('/subscription')} variant="primary" fullWidth>Upgrade to Brotherhood</Button>
          <Button onClick={() => navigate('/subscription')} variant="outline" fullWidth>Explore Lifechanger Benefits</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-20 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-oswald mb-0 flex items-center">
            <Zap size={24} className="mr-2 text-green-400"/>AI Tactical Edge
        </h1>
        <Button size="sm" variant="secondary" onClick={fetchAiSuggestions} className="flex items-center">
            <RotateCcw size={14} className="mr-1"/> Refresh
        </Button>
      </div>
      
      {activeAiChallenges.filter(c => c.status === 'active').length > 0 && (
        <section>
          <h2 className="text-xl font-oswald text-yellow-400 mb-3">Active Challenges</h2>
          {activeAiChallenges.filter(c => c.status === 'active').map(challenge => (
            <AICard 
              key={`active-${challenge.id}`} 
              suggestion={challenge} 
              onComplete={completeAiChallenge}
              isActiveChallenge={true}
            />
          ))}
        </section>
      )}

      <section>
        <h2 className="text-xl font-oswald text-green-400 mb-3">New Suggestions</h2>
        {aiSuggestions.length > 0 ? (
          aiSuggestions.map(suggestion => (
            <AICard 
              key={suggestion.id} 
              suggestion={suggestion} 
              onAccept={suggestion.type === 'Challenge' ? acceptAiChallenge : undefined}
              onDismiss={dismissAiSuggestion}
            />
          ))
        ) : (
          <Card>
            <p className="text-gray-400 text-center">No new AI suggestions right now. Check back later or refresh.</p>
          </Card>
        )}
      </section>

      {activeAiChallenges.filter(c => c.status === 'completed').length > 0 && (
        <section className="mt-8 opacity-70">
          <h2 className="text-lg font-oswald text-gray-500 mb-3">Recently Completed</h2>
          {activeAiChallenges.filter(c => c.status === 'completed').slice(0,3).map(challenge => (