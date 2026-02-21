export declare function fetchAdminData(): Promise<{
    config: any;
    sets: any;
    questions: any;
    users: any;
    colleges: any;
    departments: any;
}>;
export declare function createSet(name: string): Promise<any>;
export declare function deleteSet(id: string): Promise<{
    success: boolean;
}>;
export declare function updateConfig(timeLimit: number, numQuestions: number): Promise<{
    success: boolean;
}>;
export declare function addQuestion(text: string, options: string[], correctOption: number, setName: string, sectionName: string): Promise<{
    success: boolean;
}>;
export declare function updateQuestion(id: string, text: string, options: string[], correctOption: number, setName: string, sectionName: string): Promise<{
    success: boolean;
}>;
export declare function deleteQuestion(id: string): Promise<{
    success: boolean;
}>;
export declare function addCollege(name: string): Promise<{
    success: boolean;
}>;
export declare function deleteCollege(id: string): Promise<{
    success: boolean;
}>;
export declare function addDepartment(name: string, collegeId: string): Promise<{
    success: boolean;
}>;
export declare function deleteDepartment(id: string): Promise<{
    success: boolean;
}>;
export declare function deleteUser(id: string): Promise<{
    success: boolean;
}>;
export declare function resetExam(userId: string): Promise<{
    success: boolean;
    message: string;
} | {
    success: boolean;
    message?: undefined;
}>;
export declare function changeAdminPassword(newPassword: string): Promise<{
    success: boolean;
}>;
export declare function getProfile(id: string): Promise<any>;
export declare function upsertProfile(data: any): Promise<{
    success: boolean;
}>;
export declare function getColleges(): Promise<any>;
export declare function getDepartments(): Promise<any>;
export declare function checkExamStatus(userId: string): Promise<any>;
export declare function startExam(userId: string): Promise<any>;
export declare const getExamConfig: () => Promise<any>;
export declare function fetchQuestions(attemptId: string): Promise<any>;
export declare function submitExam(attemptId: string, answers: Record<string, number>, status: string): Promise<{
    success: boolean;
}>;
export declare function getResult(userId: string): Promise<any>;
