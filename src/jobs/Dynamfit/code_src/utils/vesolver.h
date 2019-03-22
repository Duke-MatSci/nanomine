#define intL long int

void Taylor_Method (intL, double *, double *, intL, double *, double *, double *,
		 				  intL, intL, intL);

void Taylor_Coeffs (double, double *, double *, intL, double *, double *, double,
						  double, double *, double *);

void Taylor_2D (intL, intL, double ***, double *, intL, double **, double **, double *);

void Create_Prony_SVD (intL, double *, double *, intL, double, double, double *,
							  double *, double *);

void Create_Prony_SVD_Basis (double, double *, double *, intL);

void Invert_Prony_SVD (intL, double *, double *, intL, double *, double *, intL,
							  double *, double *, double, double, double *);

void Invert_Prony_SVD_Basis (double, double *, double *, intL);

int EqualValues (double, double, double);

void Lamina_S2G_SVD (intL, intL, double, double, double, double *, double **, double,
							double, double, double, double, double *,
							double, double, double, double *);

void Create_Prony_Sign (intL, double *, double *, intL, double, double, double *,
								double *, double *, intL);

void Prony_Sign_Eval (double, double *, double *, double *);

void Create_Prony_Guess (intL, double, double, double, double, double *, double *);

void Perform_Guess_Calc (intL, double, double, double, double, double, double, double,
								 intL, double *, double *);

void Invert_Prony_Sign (intL, double *, double *, intL, double *, double *, intL,
								double *, double *, double, double, double *, intL);

void Invert_Sign_Eval (double, double *, double *, double *);

double Calc_Zij_For_Inverse (double, double, double, double, double);

void Create_Dynamic_SVD (intL, double *, double *, double *, intL, double, double,
								 double *, double *, double *);

void Dynam_Basis (double, double *, double *, intL);

void Prony_Dynam (double, double *, double *, double *);

void Set_Relaxation_Times (intL, double *, double, double);

void Step_Response (double, double *, double *, double *);

void calc_lambda_types (double, double *, double *, double *, intL);

void calc_lambda_standard (double, double, double, double, double *, double *, intL);

void set_step_response_size (intL, intL, intL, intL, intL *, intL *, intL *, intL *);

void Kohlrausch_Time (double *, intL, double *, double *, double *);

void Kohlrausch (double, double *, double *, double *);

void Create_Prony_SVD_Step (intL, double *, double *, double *, intL, double, double, double *,
									 double *, double *, double *, double *, intL, double *);

void Prony_Basis_Step (double, double *, double *, intL);

void Fit_Prony_Eta_Compliance (intL, double *, double *, intL, double *, double *,
										 intL, double *, double *, intL NumPts, double *,
										 double *, double *, double *);

void Prony_Eta_Compliance_Sign_Control (double, double *, double *, double *);

void Prony_Compliance_Sign_Control (double, double *, double *, double *);

void Fit_Compliance_Prony (intL, double *, double *, double, intL, double *, double *,
									double *);

void Fit_Lambda_Prony (intL, double *, double *, double, intL, double *, double *,
							  double *);

void Prony_Lambda_Sign_Control (double, double *, double *, double *);

void Set_Prony_Guess (intL, double *, double *, double *, double, double, double,
							 double, double);

void Simple_Prony_Sign_Solution (intL, double *, double *, double, intL, double *,
										   double *, double *);

intL comp_mod_check (double *, double *, intL, double *, char *, char *, intL);

void modify_std_dev (intL, double *, double *, intL, double);

void Create_Data_Subset (intL NumPts, double *t, double *y, double *std,
								 intL NumSub, double *tsub, double *ysub, double *stdsub);

void calc_w_space (intL, double *, double *, intL, double *, double, double, double);

double calc_w_point (double, double, double, double, double, intL);

double Kohlrausch_To_Prony_SVD (double, double, double, intL, intL, double, double,
							 			  intL, double **, double **);

double Prony_To_Kohlrausch (double *, double *, double *, intL, intL, double , double,
							 		 intL, double *, double *);

