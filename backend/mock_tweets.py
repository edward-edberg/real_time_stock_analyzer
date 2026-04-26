"""
Mock Trump-style tweets for the demo. Picked to span sectors and polarities so the
LLM analysis produces visibly different outputs across the rotation.
"""

MOCK_TWEETS = [
    {
        "id": "1",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T09:14:00Z",
        "text": (
            "We will be putting MASSIVE tariffs on Chinese semiconductors. "
            "American chip makers will WIN BIG. NVIDIA, INTEL doing great work!"
        ),
    },
    {
        "id": "2",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T10:02:00Z",
        "text": (
            "The Fed is making a HUGE mistake keeping rates so high. "
            "Powell has no clue. We need rate cuts NOW or the economy will suffer."
        ),
    },
    {
        "id": "3",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T10:45:00Z",
        "text": (
            "Just spoke with the great American oil producers. "
            "We will UNLEASH American energy. Drill baby drill! "
            "Exxon, Chevron, ConocoPhillips - back in business!"
        ),
    },
    {
        "id": "4",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T11:20:00Z",
        "text": (
            "TikTok is a national security THREAT. "
            "We will ban it unless it is sold to American owners. Period."
        ),
    },
    {
        "id": "5",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T12:05:00Z",
        "text": (
            "Pharmaceutical companies are RIPPING OFF the American people. "
            "Drug prices coming WAY DOWN. Pfizer, Eli Lilly, watch out!"
        ),
    },
    {
        "id": "6",
        "author": "@realDonaldTrump",
        "timestamp": "2026-04-26T13:30:00Z",
        "text": (
            "Crypto is the FUTURE. America will be the crypto capital of the world. "
            "Bitcoin going to the moon!"
        ),
    },
]
