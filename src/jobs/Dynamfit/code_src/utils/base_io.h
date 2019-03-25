#define intL long int

void startup_project_name (char *, char **);
void get_project (char *);
void get_material (char *, char *);
void toupper_string (char *string);
void tolower_string (char *string);

void make_file_name (char *, char *, char *);
FILE *open_file_for_read_write_append (char *, char *, intL);
intL file_length (char *, char *, char *, intL *, intL);
intL read_XY_data (double **, double **, double **, char *, char *, intL, intL, char *);

intL read_file_single_line (FILE *, char *, intL, intL);
intL advance_FILE_pointer_to_data (FILE *, intL);
void move_FILE_back_n_slots (FILE *, intL);
void skip_header (FILE *, char *);

void read_config_file (char *, char *, char **, char **, intL, intL);
double set_dbl_param_value (char *, double, char *, char *, double, double, intL, intL);
intL set_int_param_value (char *, intL, char *, char *, intL, intL, intL);

intL get_int_value (char *, char *, intL, intL);
double get_dbl_value (char *, char *, double, double, intL);
void check_double_limits (double, char *, double, double, intL);

void wait_key (intL, intL, intL);
void hit_key (intL);

void locate_on_screen (intL, intL);
void change_screen_color (intL, intL);
void clear_screen ();