import { DomainError } from '../../../shared/domain-error';
import { ParentStudentAccess } from './ports';

export interface AuthenticatedParentIdentity {
  readonly id: string;
}

export interface AuthorizeParentStudentAccessInput {
  readonly parent: AuthenticatedParentIdentity | null;
  readonly studentId: string;
}

export class AuthorizeParentStudentAccess {
  constructor(private readonly parentStudentAccess: ParentStudentAccess) {}

  async execute(input: AuthorizeParentStudentAccessInput): Promise<void> {
    if (input.parent === null) {
      throw new DomainError('AUTHENTICATION_REQUIRED');
    }

    const hasAccess = await this.parentStudentAccess.hasAccess(
      input.parent.id,
      input.studentId,
    );
    if (!hasAccess) {
      throw new DomainError('PARENT_STUDENT_ACCESS_DENIED');
    }
  }
}
