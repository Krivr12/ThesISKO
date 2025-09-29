export type ParsedGroupId = {
    schoolYear: string;   // e.g., "2024 - 2025"
    course: string;       // e.g., "BSIT" / "BSCS"
    year: string;         // e.g., "3" (from block number)
    section: string;      // e.g., "5" or "B" (from block number)
    groupNo: string;      // e.g., "01" (from block number)
    blockNumber: string;  // e.g., "5-11" (full block number)
  };
  
export function parseGroupId(groupId: string): ParsedGroupId {
  const parts = groupId.trim().split('-').map(s => s.trim());
  
  if (parts.length < 3) throw new Error('Invalid group_id format');

  const syCode = parts[0];        // e.g., "2425"
  const courseCode = parts[1];    // e.g., "IT" or "CS"

  // Parse school year from syCode (e.g., "2425" -> "2024 - 2025")
  const startYY = Number(syCode.slice(0, 2));
  const endYY   = Number(syCode.slice(2));
  const schoolYear = `${2000 + startYY} - ${2000 + endYY}`;

  // Parse course
  const course = courseCode.toUpperCase() === 'IT' ? 'BSIT'
               : courseCode.toUpperCase() === 'CS' ? 'BSCS'
               : courseCode;

  let year = '', section = '', groupNo = '', blockNumber = '';

  if (parts.length === 4) {
    // New format: 2425-IT-5-11 (school year, program, block section, block number)
    const blockSection = parts[2];  // e.g., "5"
    const blockNum = parts[3];      // e.g., "11"
    
    year = blockSection;
    section = '';  // No separate section in this format
    groupNo = blockNum;
    blockNumber = `${blockSection}-${blockNum}`;
  } else if (parts.length === 3) {
    // Old format: 2526-IT-219023 (school year, course, timestamp/identifier)
    groupNo = parts[2];
    blockNumber = parts[2]; // Use the third part as block number for compatibility
    year = '';
    section = '';
  } else if (parts.length === 5) {
    // Legacy format: 2526-IT-3-B-01 (school year, course, year, section, group)
    year = parts[2];
    section = parts[3];
    groupNo = parts[4];
    blockNumber = `${year}${section}-${groupNo}`;
  } else {
    // Fallback for other formats
    groupNo = parts[parts.length - 1];
    blockNumber = groupNo;
    year = parts.length > 3 ? parts[2] : '';
    section = parts.length > 4 ? parts[3] : '';
  }

  return { schoolYear, course, year, section, groupNo, blockNumber };
}
  