import { NamingStrategyInterface } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

/**
 * Core naming strategy that converts all table and column names to snake_case
 * and customizes join table and join column naming conventions.
 */
export class CoreNamingStrategy
  extends SnakeNamingStrategy
  implements NamingStrategyInterface
{
  /**
   * Generates join table name in format: first_table_to_second_table
   */
  joinTableName(firstTableName: string, secondTableName: string): string {
    return `${firstTableName}_to_${secondTableName}`;
  }

  /**
   * Generates join column name in format: relation_name_referenced_column
   */
  joinColumnName(relationName: string, referencedColumnName: string): string {
    return `${relationName}_${referencedColumnName}`;
  }
}
