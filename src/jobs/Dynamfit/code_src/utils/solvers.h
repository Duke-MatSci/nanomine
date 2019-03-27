#define intL long int

void Levenberg (double *, double *, double *, intL, double *, intL, intL *, intL,
					 double *, double *, void (*) (double, double *, double *, double *),
					 char *, double *);

void mrqcof (double *, double *, double *, intL, double *, intL, intL *, intL,
				 double **, double *, double *,
				 void (*) (double, double *, double *, double *));

int User_Requests_Stop (void);

void LM_Subset (double *, double *, double *, intL, double *, intL, intL *, intL,
					 double *, double *, void (*) (double, double *, double *, double *),
					 char *, double *);

void print_results (char *, double *, intL *, intL, double, intL);

void calc_band_inverse (double **, double **, intL, intL);

void Gauss_Jordan (intL, double **, double *, double *);

void svdfit (double *, double *, double *, intL, double *, intL, double *,
				 void (*)(double, double *, double *, intL));

void svdcmp (double **, intL, intL, double *, double **);

void svbksb(double **, double *, double **, intL, intL, double *, double *);

double rtsafe (void (*)(double, double *, double *, double *),
					double *, double, double, double, intL);

double brent (double, double, double, double (*) (double, double *),
				  double, double *, double *);

void rkck (double *, double *, intL, double, double, double *, double *, double *,
			  void (*)(double, double *, double *, double *));

void rkqs (double *, double *, intL, double *, double, double, double *, double *,
			  double *, double *, void (*)(double, double *, double *, double *));

intL odeint (intL, intL, double *, double **, double *, double, double, double, double,
				 double, double *, void (*)(double, double *, double *, double *), intL,
				 double, intL *, intL *, intL);

double root_bisection (double (*)(double, double *), double, double, double,
							  double *, intL);

void line_fit (intL, double *, double *, double, double *, double *, double *);

void line_basis (double, double *, double *, intL);

