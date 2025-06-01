/* ... as before ... */ },

      currentCycleCheckIns: {},
      setDailyCheckIn: async (checkInInput) => {
        const state = get();
        if (!state.profile || !state.currentCycle) {
            console.warn("User or cycle not loaded for check-in. Saving locally only.");
            const dateKey = checkInInput.date;
            const tempCheckInRecord = { ...checkInInput, user_id: state.profile?.id || 'tempUser', cycle_id: state.currentCycle?.id || 'tempCycle', xp_awarded: 0 };
            const dayCheckIns = state.currentCycleCheckIns[dateKey] || [];
            const existingIndex = dayCheckIns.findIndex(ci => ci.domain_type === tempCheckInRecord.domain_type);
            if (existingIndex > -1) dayCheckIns[existingIndex] = tempCheckInRecord;
            else dayCheckIns.push(tempCheckInRecord);
            set({ currentCycleCheckIns: { ...state.currentCycleCheckIns, [dateKey]: [...dayCheckIns] } });
            return;
        }

        let xpAwarded = 0;
        if (checkInInput.status === 'Done') xpAwarded = XP_PER_CHECK_IN_DONE;
        else if (checkInInput.status === 'Partial') xpAwarded = XP_PER_CHECK_IN_PARTIAL;

        const dbRecord: DailyCheckInData = {
            ...checkInInput,
            user_id: state.profile.id,
            cycle_id: state.currentCycle.id,
            xp_awarded: xpAwarded,
        };

        const dateKey = checkInInput.date;
        const dayCheckIns = [...(state.currentCycleCheckIns[dateKey] || [])]; 
        const existingIndex = dayCheckIns.findIndex(ci => ci.domain_type === checkInInput.domain_type);
        let oldRecord = null;
        if (existingIndex > -1) {
            oldRecord = {...dayCheckIns[existingIndex]};
            dayCheckIns[existingIndex] = dbRecord;
        } else {
            dayCheckIns.push(dbRecord);
        }
        set({ currentCycleCheckIns: { ...state.currentCycleCheckIns, [dateKey]: dayCheckIns } });

        if (state.profile.tier !== 'free') {
            if (xpAwarded > 0) {
                await state.updateProfileXP(xpAwarded);