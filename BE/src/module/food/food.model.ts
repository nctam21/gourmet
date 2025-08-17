export class Food {
    /** OrientDB record id (@rid) */
    readonly '@rid'?: string;
    /** Food name */
    name: string;
    /** Food image */
    image_url: string;
    /** Food description */
    description: string;
    /** Food type */
    type: string;
    /** Food ingredients */
    ingredients: string;
    /** Food recipe */
    recipe: string;
    /** Food price */
    price: number;
    /** Food view count */
    view_count?: string;
}