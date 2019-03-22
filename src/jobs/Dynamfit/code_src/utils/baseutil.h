#define intL long int

double *dvector (intL, intL);
void free_dvector (double *, intL);

intL *ivector(intL, intL);
void free_ivector (intL *, intL);

char *chvector (intL, intL);
void free_chvector (char *, intL);

double **dmatrix (intL, intL, intL, intL);
void free_dmatrix (double **, intL, intL, intL);

char **chmatrix (intL, intL, intL, intL);
void free_chmatrix (char **, intL, intL, intL);

double ***d3tensor (intL, intL, intL, intL, intL, intL);
void free_d3tensor (double ***, intL, intL, intL, intL, intL);

double ****d4tensor (intL, intL, intL, intL, intL, intL, intL, intL);
void free_d4tensor (double ****, intL, intL, intL, intL, intL, intL, intL);

FILE **FILE_vector (intL nl, intL nh);
void free_FILE_vector (FILE **stream, intL nl);

void nrerror(char *);
void error_with_ignore (char *error_text);

double dbl_vector_ptr_to_dbl (double *);
double* dbl_to_dbl_vector_ptr (double);

double int_vector_ptr_to_dbl (intL *);
intL* dbl_to_int_vector_ptr (double);

double dbl_matrix_ptr_to_dbl (double **);
double** dbl_to_dbl_matrix_ptr (double);

double dbl_3tensor_ptr_to_dbl (double ***);
double*** dbl_to_dbl_3tensor_ptr (double);

