import { DomainFocusData } from &#39;../store/useAppStore&#39;; // Assuming DomainFocusData is exported from useAppStore or defined elsewhere

export interface IdentityAnchor {
id: string;
name: string;
description: string;
}
export const CORE\_DOMAINS\_DEF: DomainFocusData['domain\_type'][] = ['BODY', 'LOVE', 'MISSION', 'SPIRIT'];
export const PERSONAL\_OBJECTIVE\_DOMAIN\_DEF: DomainFocusData['domain\_type'] = 'PERSONAL\_OBJECTIVE';
