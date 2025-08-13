export class Food {
    /** OrientDB record id */
    readonly id?: string;
    /** Food name */
    name: string;
    /** Food description */
    description: string;
    /** Food type */
    type: string;
    /** Food ingredients */
    ingredients: string;
    /** Food recipe */
    recipe: string;
    /** Food image */
    imageURL: string;
    /** Food price */
    price: number;
}