import type { Scope } from './types';

/**
 * Real-poll benchmarks. Each decision should start from the named poll, and the full
 * simulation should land near it. Used by realism.test.ts and the Methodology page.
 */
export interface Benchmark {
  decision: string;
  scope?: Scope;
  /** The published figure (%), among the population the poll describes. */
  poll: number;
  source: string;
  year: number;
}

export const BENCHMARKS: Benchmark[] = [
  { decision: 'Ban phones during class', scope: 'school', poll: 68, source: 'Pew Research Center', year: 2024 },
  { decision: 'Ban phones for the entire school day', scope: 'school', poll: 36, source: 'Pew Research Center', year: 2024 },
  { decision: 'Require parental consent for teens to use social media', poll: 81, source: 'Pew Research Center', year: 2023 },
  { decision: 'Ban TikTok', poll: 34, source: 'Pew Research Center', year: 2025 },
  { decision: 'Make school lunch free for all students', poll: 60, source: 'YouGov', year: 2023 },
  { decision: 'Switch our district to a four-day school week', scope: 'school', poll: 60, source: 'EdChoice', year: 2023 },
  { decision: 'Start high school later, at 8:30 a.m.', scope: 'school', poll: 51, source: 'C.S. Mott Children’s Hospital', year: 2015 },
  { decision: 'Raise the minimum wage to $15 an hour', poll: 62, source: 'Pew Research Center', year: 2021 },
  { decision: 'Raise taxes on large corporations', poll: 63, source: 'Pew Research Center', year: 2025 },
  { decision: 'Raise taxes on household income over $400,000', poll: 58, source: 'Pew Research Center', year: 2025 },
  { decision: 'Phase out gas-powered cars by 2035', poll: 40, source: 'Pew Research Center', year: 2023 },
  { decision: 'Let Medicare negotiate prescription drug prices', poll: 85, source: 'KFF', year: 2024 },
  { decision: 'Legalize marijuana for recreational use', poll: 57, source: 'Pew Research Center', year: 2024 },
  { decision: 'Require background checks for private gun sales and gun shows', poll: 81, source: 'Pew Research Center', year: 2021 },
  { decision: 'Ban assault-style weapons', poll: 63, source: 'Pew Research Center', year: 2021 },
  { decision: 'Elect the president by national popular vote', poll: 63, source: 'Pew Research Center', year: 2024 },
  { decision: 'Require a government-issued photo ID to vote', poll: 81, source: 'Pew Research Center', year: 2024 },
  { decision: 'Make Election Day a national holiday', poll: 72, source: 'Pew Research Center', year: 2024 },
  { decision: 'Automatically register all eligible citizens to vote', poll: 57, source: 'Pew Research Center', year: 2024 },
  { decision: 'Ban members of Congress from trading individual stocks', poll: 86, source: 'University of Maryland', year: 2023 },
  { decision: 'Set term limits for Supreme Court justices', poll: 67, source: 'AP-NORC', year: 2022 },
  { decision: 'Set a maximum age for members of Congress', poll: 80, source: 'NPR/PBS News/Marist', year: 2026 },
  { decision: 'Stop changing the clocks for daylight saving time', poll: 70, source: 'AP-NORC', year: 2019 },
  { decision: 'Move our company to a four-day work week', scope: 'business', poll: 66, source: 'Ipsos', year: 2021 },
  // housing, school safety, climate and local taxes
  { decision: 'Build a new apartment building downtown', poll: 65, source: 'YouGov', year: 2022 },
  { decision: 'Allow duplexes and townhomes in single-family neighborhoods', poll: 48, source: 'AEI Housing Center / Ipsos', year: 2026 },
  { decision: 'Rezone our neighborhood for high-density apartment towers', poll: 30, source: 'YouGov', year: 2022 },
  { decision: 'Open a homeless shelter near downtown', poll: 64, source: 'YouGov', year: 2022 },
  { decision: 'Cap yearly rent increases at 5%', poll: 69, source: 'YouGov', year: 2022 },
  { decision: 'Increase spending on public housing', poll: 60, source: 'YouGov', year: 2022 },
  { decision: 'Put armed police officers in every school', poll: 80, source: 'PDK Poll', year: 2022 },
  { decision: 'Install metal detectors at all school entrances', poll: 78, source: 'PDK Poll', year: 2022 },
  { decision: 'Allow teachers to carry guns at school', poll: 50, source: 'Pew Research Center', year: 2023 },
  { decision: 'Prioritize wind and solar power over fossil fuels', poll: 57, source: 'Pew Research Center', year: 2026 },
  { decision: 'Tax corporations on their carbon emissions', poll: 70, source: 'Pew Research Center', year: 2023 },
  { decision: 'Build a wind farm near our town', poll: 63, source: 'YouGov', year: 2022 },
  { decision: 'Build a solar farm outside town', poll: 68, source: 'NORC (for GoodPower)', year: 2026 },
  { decision: 'Ban gas stoves', poll: 40, source: 'YouGov', year: 2023 },
  { decision: 'Require new buildings to be all-electric with no gas hookups', poll: 46, source: 'Pew Research Center', year: 2023 },
  { decision: 'Raise local property taxes to increase teacher salaries', poll: 67, source: 'PDK Poll', year: 2023 },
];
