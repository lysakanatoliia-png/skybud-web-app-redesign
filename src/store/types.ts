type Category = {
  _id: string;
  img: string;
  title: string;
}

export type SelectedSystem = Category;
export type SelectedModule = Category & { number: number };
