import { useState, useCallback, useMemo } from 'react';
import {
  getCachedStudents,
  getCachedContacts,
  getCachedAssignments,
  getCachedHomework,
  CachedStudent,
  CachedContact,
  CachedAssignment,
  CachedHomework,
} from '@/lib/offline-db';

export type OfflineSearchResult = {
  id: string;
  type: 'student' | 'contact' | 'assignment' | 'homework' | 'message';
  title: string;
  subtitle: string;
  matchedField: string;
  score: number;
};

interface UseOfflineSearchOptions {
  schoolId: string | null;
  enabled?: boolean;
  maxResults?: number;
}

/**
 * Full-text search across IndexedDB cached data
 * Works completely offline for students, contacts, assignments, homework
 */
export function useOfflineSearch({
  schoolId,
  enabled = true,
  maxResults = 20,
}: UseOfflineSearchOptions) {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<OfflineSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate relevance score based on match position and type
  const calculateScore = useCallback((query: string, text: string, fieldWeight: number): number => {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();
    
    if (lowerText === lowerQuery) return 100 * fieldWeight; // Exact match
    if (lowerText.startsWith(lowerQuery)) return 80 * fieldWeight; // Starts with
    if (lowerText.includes(lowerQuery)) return 60 * fieldWeight; // Contains
    
    // Fuzzy match - check if all characters exist in order
    let queryIndex = 0;
    for (const char of lowerText) {
      if (char === lowerQuery[queryIndex]) {
        queryIndex++;
        if (queryIndex === lowerQuery.length) return 40 * fieldWeight;
      }
    }
    
    return 0;
  }, []);

  // Search function
  const search = useCallback(async (query: string): Promise<OfflineSearchResult[]> => {
    if (!schoolId || !enabled || query.length < 2) {
      setResults([]);
      return [];
    }

    setIsSearching(true);
    setError(null);

    try {
      const allResults: OfflineSearchResult[] = [];
      const lowerQuery = query.toLowerCase();

      // Search students
      const students = await getCachedStudents(schoolId);
      for (const student of students) {
        const fullName = `${student.firstName} ${student.lastName || ''}`.trim();
        const nameScore = calculateScore(query, fullName, 1.5);
        const classScore = calculateScore(query, student.className, 0.8);
        const sectionScore = calculateScore(query, student.classSectionName, 0.8);
        
        const maxScore = Math.max(nameScore, classScore, sectionScore);
        if (maxScore > 0) {
          allResults.push({
            id: student.id,
            type: 'student',
            title: fullName,
            subtitle: `${student.className} - ${student.classSectionName}`,
            matchedField: nameScore >= classScore ? 'name' : 'class',
            score: maxScore,
          });
        }
      }

      // Search contacts
      const contacts = await getCachedContacts(schoolId);
      for (const contact of contacts) {
        const nameScore = calculateScore(query, contact.displayName, 1.5);
        const emailScore = contact.email ? calculateScore(query, contact.email, 1.2) : 0;
        const roleScore = contact.role ? calculateScore(query, contact.role, 0.5) : 0;
        
        const maxScore = Math.max(nameScore, emailScore, roleScore);
        if (maxScore > 0) {
          allResults.push({
            id: contact.id,
            type: 'contact',
            title: contact.displayName,
            subtitle: contact.email || contact.role || 'Contact',
            matchedField: nameScore >= emailScore ? 'name' : 'email',
            score: maxScore,
          });
        }
      }

      // Search assignments
      const assignments = await getCachedAssignments(schoolId);
      for (const assignment of assignments) {
        const titleScore = calculateScore(query, assignment.title, 1.5);
        const descScore = assignment.description 
          ? calculateScore(query, assignment.description, 0.8) 
          : 0;
        const sectionScore = calculateScore(query, assignment.sectionLabel, 0.6);
        
        const maxScore = Math.max(titleScore, descScore, sectionScore);
        if (maxScore > 0) {
          allResults.push({
            id: assignment.id,
            type: 'assignment',
            title: assignment.title,
            subtitle: `${assignment.sectionLabel} • Due: ${assignment.dueDate || 'No date'}`,
            matchedField: titleScore >= descScore ? 'title' : 'description',
            score: maxScore,
          });
        }
      }

      // Search homework
      const homework = await getCachedHomework(schoolId);
      for (const hw of homework) {
        const titleScore = calculateScore(query, hw.title, 1.5);
        const descScore = hw.description 
          ? calculateScore(query, hw.description, 0.8) 
          : 0;
        
        const maxScore = Math.max(titleScore, descScore);
        if (maxScore > 0) {
          allResults.push({
            id: hw.id,
            type: 'homework',
            title: hw.title,
            subtitle: `${hw.sectionLabel} • Due: ${hw.dueDate}`,
            matchedField: 'title',
            score: maxScore,
          });
        }
      }

      // Sort by score and limit results
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, maxResults);

      setResults(sortedResults);
      return sortedResults;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      console.error('[OfflineSearch] Error:', err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [schoolId, enabled, maxResults, calculateScore]);

  // Clear results
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, OfflineSearchResult[]> = {
      student: [],
      contact: [],
      assignment: [],
      homework: [],
      message: [],
    };
    
    for (const result of results) {
      groups[result.type].push(result);
    }
    
    return groups;
  }, [results]);

  return {
    search,
    clear,
    results,
    groupedResults,
    isSearching,
    error,
    hasResults: results.length > 0,
  };
}
