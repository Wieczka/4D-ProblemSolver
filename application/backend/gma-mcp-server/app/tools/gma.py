"""
General Morphological Analysis (GMA) tool for the GMA MCP Server.

Implements a Zwicky Box CSP solver with Cross-Consistency Assessment (CCA)
filtering. Designed for structured product/architecture exploration by
eliminating logically or technologically inconsistent variant combinations.
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Pydantic contracts
# ---------------------------------------------------------------------------


class Dimension(BaseModel):
    name: str = Field(
        ...,
        description="Nazwa parametru lub wymiaru strukturalnego w Zwicky Box (np. 'Material')",
    )
    variants: list[str] = Field(
        ...,
        description="Lista dopuszczalnych wariantów/wartości dla danego wymiaru",
    )


class Incompatibility(BaseModel):
    dim1: str = Field(..., description="Nazwa pierwszego wymiaru w regule wykluczenia")
    var1: str = Field(..., description="Wartość wariantu dla pierwszego wymiaru")
    dim2: str = Field(..., description="Nazwa drugiego wymiaru w regule wykluczenia")
    var2: str = Field(..., description="Wartość wariantu dla drugiego wymiaru")


# ---------------------------------------------------------------------------
# Solver engine
# ---------------------------------------------------------------------------


class ZwickyCSPSolver:
    """Deterministic backtracking CSP solver for Zwicky morphological boxes."""

    def __init__(
        self,
        dimensions: list[Dimension],
        incompatibilities: list[Incompatibility],
        max_candidates: int = 1000,
    ):
        self.dimensions = dimensions
        self.incompatibilities = incompatibilities
        self.max_candidates = max_candidates

        # O(1) lookup helpers
        self.dim_variants: dict[str, set[str]] = {
            d.name: set(d.variants) for d in dimensions
        }
        self.forbidden_pairs: set[tuple[str, str, str, str]] = set()

    # -- validation ---------------------------------------------------------

    def validate(self) -> list[str]:
        """Rigorous input validation. Returns a list of error messages."""
        errors: list[str] = []

        if not self.dimensions:
            errors.append("Lista wymiarów (dimensions) nie może być pusta.")
            return errors

        # 1. Unique dimensions & variants
        seen_dims: set[str] = set()
        for d in self.dimensions:
            stripped_name = d.name.strip()
            if not stripped_name:
                errors.append("Nazwa wymiaru nie może być pusta.")
            if stripped_name in seen_dims:
                errors.append(f"Zdublowany wymiar w definicji: '{stripped_name}'.")
            seen_dims.add(stripped_name)

            if not d.variants:
                errors.append(
                    f"Wymiar '{d.name}' musi zawierać przynajmniej jeden wariant."
                )
            else:
                seen_vars: set[str] = set()
                for v in d.variants:
                    stripped_var = v.strip()
                    if not stripped_var:
                        errors.append(f"Wymiar '{d.name}' zawiera pusty wariant.")
                    if stripped_var in seen_vars:
                        errors.append(
                            f"Wymiar '{d.name}' zawiera zdublowany wariant: '{stripped_var}'."
                        )
                    seen_vars.add(stripped_var)

        # 2. CCA rules reference existing dimensions/variants
        for idx, inc in enumerate(self.incompatibilities):
            if inc.dim1 not in self.dim_variants:
                errors.append(
                    f"Reguła CCA #{idx + 1}: Wymiar '{inc.dim1}' nie istnieje w definicji skrzynki."
                )
            elif inc.var1 not in self.dim_variants[inc.dim1]:
                errors.append(
                    f"Reguła CCA #{idx + 1}: Wariant '{inc.var1}' nie istnieje w wymiarze '{inc.dim1}'."
                )

            if inc.dim2 not in self.dim_variants:
                errors.append(
                    f"Reguła CCA #{idx + 1}: Wymiar '{inc.dim2}' nie istnieje w definicji skrzynki."
                )
            elif inc.var2 not in self.dim_variants[inc.dim2]:
                errors.append(
                    f"Reguła CCA #{idx + 1}: Wariant '{inc.var2}' nie istnieje w wymiarze '{inc.dim2}'."
                )

        return errors

    # -- solver -------------------------------------------------------------

    def solve(self) -> dict:
        """Run backtracking CSP search with CCA pruning."""
        errors = self.validate()
        if errors:
            return {
                "status": "error",
                "message": "Błąd walidacji parametrów wejściowych.",
                "errors": errors,
                "candidates": [],
            }

        # Build symmetric forbidden-pair set for O(1) consistency checks
        for inc in self.incompatibilities:
            self.forbidden_pairs.add((inc.dim1, inc.var1, inc.dim2, inc.var2))
            self.forbidden_pairs.add((inc.dim2, inc.var2, inc.dim1, inc.var1))

        solutions: list[dict[str, str]] = []
        limit_exceeded = False

        def is_consistent(
            dim_name: str, variant: str, assignment: dict[str, str]
        ) -> bool:
            for assigned_dim, assigned_var in assignment.items():
                if (dim_name, variant, assigned_dim, assigned_var) in self.forbidden_pairs:
                    return False
            return True

        def backtrack(dim_idx: int, current_assignment: dict[str, str]) -> None:
            nonlocal limit_exceeded
            if len(solutions) >= self.max_candidates:
                limit_exceeded = True
                return

            if dim_idx == len(self.dimensions):
                solutions.append(current_assignment.copy())
                return

            current_dim = self.dimensions[dim_idx]
            for variant in current_dim.variants:
                if is_consistent(current_dim.name, variant, current_assignment):
                    current_assignment[current_dim.name] = variant
                    backtrack(dim_idx + 1, current_assignment)
                    del current_assignment[current_dim.name]

        backtrack(0, {})

        response: dict = {
            "status": "success",
            "count": len(solutions),
            "candidates": solutions,
        }

        if limit_exceeded:
            response["warning"] = (
                f"Przekroczono limit bezpieczeństwa kombinacji ({self.max_candidates}). "
                f"Zwrócono pierwsze {self.max_candidates} wyników."
            )

        return response


# ---------------------------------------------------------------------------
# FastMCP tool function
# ---------------------------------------------------------------------------


def analyze_morphology(
    dimensions: list[Dimension],
    incompatibilities: list[Incompatibility],
) -> dict:
    """
    Wykonuje Ogólną Analizę Morfologiczną (GMA) jako solver CSP przy użyciu macierzy CCA.
    Filtruje technologicznie lub logicznie sprzeczne konfiguracje wariantów produktu.

    Args:
        dimensions: Pełna lista wymiarów (parametrów) oraz ich dozwolonych wariantów.
        incompatibilities: Lista par wariantów, które nie mogą ze sobą współwystępować (CCA).
    """
    solver = ZwickyCSPSolver(dimensions, incompatibilities)
    return solver.solve()
