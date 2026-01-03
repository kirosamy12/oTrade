const getEconomicCalendar = async (req, res) => {
  try {
    // For now, we'll return mock data since we don't have an actual external API
    // In a real implementation, you would call an external economic calendar API
    const mockData = {
      events: [
        {
          id: 1,
          title: 'US Non-Farm Payrolls',
          date: '2025-01-03',
          time: '13:30',
          currency: 'USD',
          impact: 'high',
          forecast: '180K',
          previous: '155K'
        },
        {
          id: 2,
          title: 'EUR Interest Rate Decision',
          date: '2025-01-02',
          time: '11:45',
          currency: 'EUR',
          impact: 'high',
          forecast: '4.50%',
          previous: '4.50%'
        },
        {
          id: 3,
          title: 'UK GDP Growth Rate',
          date: '2025-01-05',
          time: '08:30',
          currency: 'GBP',
          impact: 'medium',
          forecast: '0.2%',
          previous: '0.1%'
        }
      ]
    };

    res.status(200).json(mockData);
  } catch (error) {
    console.error('Error fetching economic calendar:', error);
    res.status(500).json({ error: 'Failed to fetch economic calendar data.' });
  }
};

export { getEconomicCalendar };