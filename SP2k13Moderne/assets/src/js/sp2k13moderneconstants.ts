﻿export const breakpoints = { xs: '480px', sm: '768px', md: '992px', lg: '1200px' };

declare global {
    interface Window {
        jsTexts: { leaveWebsiteConfirm?: string; };
    }
}

window.jsTexts = window.jsTexts || {};