export type ParsedGroupId = {
    schoolYear: string;   // e.g., "2024 - 2025"
    course: string;       // e.g., "BSIT" / "BSCS"
    year: string;         // e.g., "3"
    section: string;      // e.g., "5" or "B"
    groupNo: string;      // e.g., "01"
  };
  
  export function parseGroupId(groupId: string): ParsedGroupId {
    const parts = groupId.trim().split('-').map(s => s.trim());
    if (parts.length < 4) throw new Error('Invalid group_id format');
  
    const syCode = parts[0];
    const courseCode = parts[1];
    const groupNo = parts[parts.length - 1];
  
    let year = '', section = '';
    if (parts.length === 5) {
      year = parts[2];
      section = parts[3];
    } else {
      const ys = parts[2];
      const m = ys.match(/^(\d)([A-Za-z0-9]+)$/);
      if (m) { year = m[1]; section = m[2]; }
      else { year = ys; section = ''; }
    }
  
    const startYY = Number(syCode.slice(0, 2));
    const endYY   = Number(syCode.slice(2));
    const schoolYear = `${2000 + startYY} - ${2000 + endYY}`;
  
    const course = courseCode.toUpperCase() === 'IT' ? 'BSIT'
                 : courseCode.toUpperCase() === 'CS' ? 'BSCS'
                 : courseCode;
  
    return { schoolYear, course, year, section, groupNo };
  }
  