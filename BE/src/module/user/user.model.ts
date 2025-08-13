/**
 * User entity for OrientDB
 */
export class User {
    /** OrientDB record id */
    readonly id?: string;
    /** User full name */
    name: string;
    /** User gender */
    gender: string;
    /** User age */
    age: number;
    /** User phone number */
    phone: string;
    /** User email */
    email: string;
    /** Hashed password */
    password: string;
    /** User region */
    region: string;
    /** Created at timestamp */
    readonly createdAt?: Date;
    /** Updated at timestamp */
    readonly updatedAt?: Date;

    constructor(init?: Partial<User>) {
        Object.assign(this, init);
    }
} 