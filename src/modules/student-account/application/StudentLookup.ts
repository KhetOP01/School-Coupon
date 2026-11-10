export interface StudentReference {
  readonly id: string;
}

export interface StudentLookup {
  findById(studentId: string): Promise<StudentReference | null>;
}
